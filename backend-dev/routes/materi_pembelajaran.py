from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Path, Request
from config.database import conn
from schemas.materi_pembelajaran import MateriOut
from models.materi_pembelajaran import MateriPembelajaran
from sqlalchemy import select, text
from decouple import config
import uuid
import os

router = APIRouter(prefix="", tags=["materi_pembelajaran"])

# Load folder dari .env and strip spaces to be robust
PATH_PDF_URL = config("PATH_PDF_URL", default="materi_uploaded/pdf").strip()
PATH_IMG_URL = config("PATH_IMG_URL", default="materi_uploaded/img").strip()

# Build base URL from HOST & PORT in .env (used to return full URL)
HOST = config("HOST", default="127.0.0.1").strip()
PORT_APP = config("PORT_APP", default="3000").strip()
try:
    PORT_INT = int(PORT_APP)
except Exception:
    PORT_INT = 3000

BASE_URL = f"http://{HOST}:{PORT_INT}"

# Buat folder jika belum ada
os.makedirs(PATH_PDF_URL, exist_ok=True)
os.makedirs(PATH_IMG_URL, exist_ok=True)


# ============================================================
# UPLOAD IMAGE (dipanggil oleh editor - ReactQuill)
# Endpoint ini menerima satu gambar dan mengembalikan URL penuh
# ============================================================
@router.post("/materi/upload-image")
async def upload_materi_image(file: UploadFile = File(...)):
    # Validasi extension sederhana
    allowed_extensions = ("jpg", "jpeg", "png", "gif", "webp")
    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Format gambar tidak didukung")

    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}.{ext}"
    save_path = os.path.join(PATH_IMG_URL, saved_name)

    # Simpan file ke disk
    try:
        with open(save_path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail="Gagal menyimpan gambar")

    # Return absolute URL agar Quill menampilkan gambar benar di browser
    file_url = f"{BASE_URL}/{PATH_IMG_URL}/{saved_name}"
    return {"url": file_url}


# ============================================================
# CREATE — Upload PDF atau image + metadata
# Note: frontend now will upload images individually via upload-image
# and insert URLs into text_materi (so create_materi doesn't need article_images)
# But we keep article_images param for backward compatibility.
# ============================================================
@router.post("/materi")
def create_materi(
    judul_materi: str = Form(...),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(...),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None),                  # PDF
    article_images: list[UploadFile] = File(None)          # Multiple images (optional)
):
    id_ = str(uuid.uuid4())
    file_list = []  # tempat menyimpan file PDF / IMG (legacy support)

    # =======================================================
    # 1. Jika jenis PDF → Simpan PDF
    # =======================================================
    if jenis_materi and jenis_materi.lower().startswith("dokumen"):
        if not file_materi:
            raise HTTPException(status_code=400, detail="File PDF wajib diunggah.")
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF.")
        pdf_name = f"{id_}.pdf"
        save_path = os.path.join(PATH_PDF_URL, pdf_name)
        with open(save_path, "wb") as f:
            f.write(file_materi.file.read())
        file_list.append(pdf_name)

    # =======================================================
    # 2. Jika ada article_images (legacy) → simpan juga
    # =======================================================
    if article_images:
        for idx, img in enumerate(article_images):
            ext = img.filename.split(".")[-1].lower()
            img_name = f"{id_}-{idx}.{ext}"
            save_path = os.path.join(PATH_IMG_URL, img_name)
            with open(save_path, "wb") as f:
                f.write(img.file.read())
            file_list.append(img_name)

    # =======================================================
    # Convert ke string (comma separated)
    # =======================================================
    file_materi_value = ",".join(file_list) if file_list else None

    ins = MateriPembelajaran.insert().values(
        id_materi=id_,
        judul_materi=judul_materi,
        deskripsi_materi=deskripsi_materi,
        jenis_materi=jenis_materi,
        file_materi=file_materi_value,
        text_materi=text_materi,
        video_materi=video_materi,
    )
    conn.execute(ins)

    return {"status": "ok", "id_materi": id_}


# ============================================================
# READ — Semua materi
# ============================================================
@router.get("/materi", response_model=list[MateriOut])
def list_all_materi():
    q = select(MateriPembelajaran)
    rows = conn.execute(q).mappings().all()
    return [dict(r) for r in rows]


# ============================================================
# READ by ID
# ============================================================
@router.get("/materi/{id_materi}", response_model=MateriOut)
def get_materi(id_materi: str):
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    r = conn.execute(q).mappings().first()

    if not r:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")

    return dict(r)


# ============================================================
# UPDATE — Ubah metadata + bisa upload PDF atau gambar baru (legacy)
# ============================================================
@router.put("/materi")
def update_materi(
    id_materi: str = Form(...),
    judul_materi: str = Form(None),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(None),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None),                  # PDF baru
    article_images: list[UploadFile] = File(None)          # IMG baru (legacy)
):
    upd_vals = {}

    # Update metadata
    if judul_materi is not None:
        upd_vals["judul_materi"] = judul_materi
    if deskripsi_materi is not None:
        upd_vals["deskripsi_materi"] = deskripsi_materi
    if jenis_materi is not None:
        upd_vals["jenis_materi"] = jenis_materi
    if text_materi is not None:
        upd_vals["text_materi"] = text_materi
    if video_materi is not None:
        upd_vals["video_materi"] = video_materi

    # =======================================================
    # Ambil data lama untuk referensi
    # =======================================================
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    existing = conn.execute(q).mappings().first()

    if not existing:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")

    old_files = existing["file_materi"].split(",") if existing["file_materi"] else []
    new_file_list = old_files.copy()

    # =======================================================
    # 1. Jika upload PDF baru
    # =======================================================
    if file_materi and jenis_materi and jenis_materi.lower().startswith("dokumen"):
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF.")
        pdf_name = f"{id_materi}.pdf"
        save_path = os.path.join(PATH_PDF_URL, pdf_name)
        with open(save_path, "wb") as f:
            f.write(file_materi.file.read())
        new_file_list = [pdf_name]

    # =======================================================
    # 2. Jika upload gambar baru (legacy append)
    # =======================================================
    if article_images and jenis_materi and jenis_materi.lower().startswith("teks"):
        start_idx = len([x for x in new_file_list if x.lower().endswith((".jpg", ".png", ".jpeg", ".webp"))])
        for offset, img in enumerate(article_images):
            ext = img.filename.split(".")[-1].lower()
            new_name = f"{id_materi}-{start_idx + offset}.{ext}"
            save_path = os.path.join(PATH_IMG_URL, new_name)
            with open(save_path, "wb") as f:
                f.write(img.file.read())
            new_file_list.append(new_name)

    upd_vals["file_materi"] = ",".join(new_file_list) if new_file_list else None

    if upd_vals:
        upd = MateriPembelajaran.update().where(
            MateriPembelajaran.c.id_materi == id_materi
        ).values(**upd_vals)

        conn.execute(upd)

    return {"status": "ok"}


# ============================================================
# DELETE
# ============================================================
@router.delete("/materi/{id_materi}")
def delete_materi(id_materi: str = Path(...)):

    # Cek apakah materi sudah diakses mahasiswa
    sql = text("""
        SELECT sa.id_student FROM student_access sa
        JOIN topik_materi tm ON tm.id_topik = sa.id_topik
        WHERE tm.id_materi = :id LIMIT 1
    """)

    rows = conn.execute(sql, {"id": id_materi}).first()
    if rows:
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus materi: sudah diakses oleh mahasiswa"
        )

    # Hapus dari database
    delq = MateriPembelajaran.delete().where(
        MateriPembelajaran.c.id_materi == id_materi
    )
    conn.execute(delq)

    return {"status": "ok"}
