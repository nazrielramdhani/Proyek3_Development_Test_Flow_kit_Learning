from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Path, Request, Depends
from config.database import engine
from schemas.materi_pembelajaran import MateriOut
from middleware.auth_bearer import JWTBearer
from models.materi_pembelajaran import MateriPembelajaran
from utilities.pdfutil import validate_pdf_content
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
@router.post("/materi/upload-image", dependencies=[Depends(JWTBearer())])
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
# CREATE — Upload materi (PDF / teks / video)
# Image TIDAK di-handle di sini
# ============================================================
@router.post("/materi", dependencies=[Depends(JWTBearer())])
def create_materi(
    judul_materi: str = Form(...),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(...),      # dokumen | teks | video
    text_materi: str = Form(None),      # berisi HTML + image URL
    video_materi: str = Form(None),     # link youtube
    file_materi: UploadFile = File(None)  # PDF
):
    id_materi = str(uuid.uuid4())
    pdf_filename = None

    # =======================================================
    # VALIDASI BERDASARKAN JENIS MATERI
    # =======================================================
    jenis = jenis_materi.lower()

    # ---- Materi PDF ----
    if jenis == "dokumen":
        if not file_materi:
            raise HTTPException(status_code=400, detail="File PDF wajib diunggah")
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF")

        # Validasi konten PDF (cek corrupt/rusak)
        file_content = file_materi.file.read()
        is_valid, error_msg = validate_pdf_content(file_content)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        pdf_filename = f"{id_materi}.pdf"
        save_path = os.path.join(PATH_PDF_URL, pdf_filename)

        with open(save_path, "wb") as f:
            f.write(file_content)

    # ---- Materi Video ----
    elif jenis == "video":
        if not video_materi:
            raise HTTPException(status_code=400, detail="Link video wajib diisi")

    # ---- Materi Teks ----
    elif jenis == "teks":
        if not text_materi:
            raise HTTPException(status_code=400, detail="Konten teks wajib diisi")

    else:
        raise HTTPException(status_code=400, detail="Jenis materi tidak valid")

    # =======================================================
    # SIMPAN KE DATABASE (gunakan lowercase untuk konsistensi)
    # =======================================================
    ins = MateriPembelajaran.insert().values(
        id_materi=id_materi,
        judul_materi=judul_materi,
        deskripsi_materi=deskripsi_materi,
        jenis_materi=jenis.lower(),  # Selalu simpan lowercase
        file_materi=pdf_filename,
        text_materi=text_materi,
        video_materi=video_materi,
    )
    with engine.begin() as conn:
        conn.execute(ins)

    return {
        "status": "ok",
        "id_materi": id_materi
    }

# ============================================================
# READ — Semua materi
# ============================================================
@router.get("/materi", response_model=list[MateriOut], dependencies=[Depends(JWTBearer())])
def list_all_materi():
    q = select(MateriPembelajaran)
    with engine.connect() as conn:
        rows = conn.execute(q).mappings().all()
    return [dict(r) for r in rows]


# ============================================================
# READ by ID
# ============================================================
@router.get("/materi/{id_materi}", response_model=MateriOut, dependencies=[Depends(JWTBearer())])
def get_materi(id_materi: str):
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    with engine.connect() as conn:
        r = conn.execute(q).mappings().first()

    if not r:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")

    return dict(r)


# ============================================================
# UPDATE — Ubah metadata + bisa upload PDF atau gambar baru (legacy)
# ============================================================
@router.put("/materi", dependencies=[Depends(JWTBearer())])
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
        upd_vals["jenis_materi"] = jenis_materi.lower()  # Selalu simpan lowercase
    if text_materi is not None:
        upd_vals["text_materi"] = text_materi
    if video_materi is not None:
        upd_vals["video_materi"] = video_materi

    # =======================================================
    # Ambil data lama untuk referensi
    # =======================================================
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    with engine.connect() as conn:
        existing = conn.execute(q).mappings().first()

    if not existing:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")

    # =======================================================
    # RESET DATA JIKA JENIS MATERI BERUBAH
    # =======================================================
    if jenis_materi:
        jenis_baru = jenis_materi.lower()
        jenis_lama = (existing["jenis_materi"] or "").lower()

        if jenis_baru != jenis_lama:
            # Jika ganti ke PDF
            if jenis_baru.startswith("dokumen"):
                upd_vals["text_materi"] = None
                upd_vals["video_materi"] = None
                new_file_list = []  # hapus semua file lama (gambar, dll)

            # Jika ganti ke TEKS
            elif jenis_baru.startswith("teks"):
                upd_vals["video_materi"] = None
                new_file_list = []

            # Jika ganti ke VIDEO
            elif jenis_baru.startswith("video"):
                upd_vals["text_materi"] = None
                new_file_list = []

    old_files = existing["file_materi"].split(",") if existing["file_materi"] else []
    new_file_list = old_files.copy()

    # =======================================================
    # VALIDASI KERAS: JIKA JENIS DOKUMEN, PDF WAJIB ADA
    # =======================================================
    if jenis_materi and jenis_materi.lower().startswith("dokumen"):
        if not file_materi:
            raise HTTPException(
                status_code=400,
                detail="Materi PDF wajib memiliki file PDF"
            )

    # =======================================================
    # 1. Jika upload PDF baru
    # =======================================================
    if file_materi and jenis_materi and jenis_materi.lower().startswith("dokumen"):
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF.")
        
        # Validasi konten PDF (cek corrupt/rusak)
        file_content = file_materi.file.read()
        is_valid, error_msg = validate_pdf_content(file_content)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        pdf_name = f"{id_materi}.pdf"
        save_path = os.path.join(PATH_PDF_URL, pdf_name)
        with open(save_path, "wb") as f:
            f.write(file_content)
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

        with engine.begin() as conn:
            conn.execute(upd)

    return {"status": "ok"}


# ============================================================
# DELETE
# ============================================================
@router.delete("/materi/{id_materi}", dependencies=[Depends(JWTBearer())])
def delete_materi(id_materi: str = Path(...)):

    # Cek apakah materi sudah diakses mahasiswa
    sql = text("""
        SELECT sa.id_student FROM student_access sa
        JOIN topik_materi tm ON tm.id_topik = sa.id_topik
        WHERE tm.id_materi = :id LIMIT 1
    """)

    with engine.connect() as conn:
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
    with engine.begin() as conn:
        conn.execute(delq)

    return {"status": "ok"}
