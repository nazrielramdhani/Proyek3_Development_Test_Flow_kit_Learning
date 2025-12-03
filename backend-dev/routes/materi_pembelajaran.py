from fastapi import APIRouter, HTTPException, Form, UploadFile, File, Path
from config.database import conn
from schemas.materi_pembelajaran import MateriOut
from models.materi_pembelajaran import MateriPembelajaran
from sqlalchemy import select, text
import uuid
import os
import json
from dotenv import load_dotenv

router = APIRouter(prefix="", tags=["materi_pembelajaran"])

# Load .env
load_dotenv()
PDF_DIR = os.getenv("PATH_PDF_URL")       # materi_uploaded/pdf
IMG_DIR = os.getenv("PATH_IMG_URL")       # materi_uploaded/img

os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

# ============================================================
# CREATE — Upload PDF + multiple images + metadata
# ============================================================
@router.post("/materi")
def create_materi(
    judul_materi: str = Form(...),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(None),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None),
    images: list[UploadFile] = File(None)
):
    id_ = str(uuid.uuid4())

    # ======================
    # Upload PDF
    # ======================
    saved_pdf = None
    if file_materi:
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "File harus PDF")

        saved_pdf = f"{id_}.pdf"
        pdf_path = os.path.join(PDF_DIR, saved_pdf)

        with open(pdf_path, "wb") as f:
            f.write(file_materi.file.read())

    # ======================
    # Upload Multiple Images
    # ======================
    saved_images = []

    if images:
        for img in images:
            ext = os.path.splitext(img.filename)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                raise HTTPException(400, "Format gambar tidak valid")

            img_name = f"{uuid.uuid4()}{ext}"
            img_path = os.path.join(IMG_DIR, img_name)

            with open(img_path, "wb") as f:
                f.write(img.file.read())

            saved_images.append(img_name)

    # Simpan ke DB (image_materi dalam bentuk JSON string)
    ins = MateriPembelajaran.insert().values(
        id_materi=id_,
        judul_materi=judul_materi,
        deskripsi_materi=deskripsi_materi,
        jenis_materi=jenis_materi,
        file_materi=saved_pdf,
        image_materi=json.dumps(saved_images),
        text_materi=text_materi,
        video_materi=video_materi
    )
    conn.execute(ins)

    return {"status": "ok", "id_materi": id_}


# ============================================================
# READ — list semua materi
# ============================================================
@router.get("/materi", response_model=list[MateriOut])
def list_all_materi():
    rows = conn.execute(select(MateriPembelajaran)).mappings().all()

    # Convert JSON string → list
    for r in rows:
        if r["image_materi"]:
            r["image_materi"] = json.loads(r["image_materi"])

    return [dict(r) for r in rows]


# ============================================================
# READ by ID 
# ============================================================
@router.get("/materi/{id_materi}", response_model=MateriOut)
def get_materi(id_materi: str):
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    r = conn.execute(q).mappings().first()

    if not r:
        raise HTTPException(404, "Materi tidak ditemukan")

    if r["image_materi"]:
        r["image_materi"] = json.loads(r["image_materi"])

    return dict(r)


# ============================================================
# UPDATE — update PDF, images, atau metadata
# ============================================================
@router.put("/materi")
def update_materi(
    id_materi: str = Form(...),
    judul_materi: str = Form(None),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(None),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None),
    images: list[UploadFile] = File(None)
):
    upd_vals = {}

    if judul_materi: upd_vals["judul_materi"] = judul_materi
    if deskripsi_materi: upd_vals["deskripsi_materi"] = deskripsi_materi
    if jenis_materi: upd_vals["jenis_materi"] = jenis_materi
    if text_materi: upd_vals["text_materi"] = text_materi
    if video_materi: upd_vals["video_materi"] = video_materi

    # Update PDF
    if file_materi:
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "File harus PDF")

        new_pdf = f"{id_materi}.pdf"
        pdf_path = os.path.join(PDF_DIR, new_pdf)

        with open(pdf_path, "wb") as f:
            f.write(file_materi.file.read())

        upd_vals["file_materi"] = new_pdf

    # Update Images (replace all)
    if images:
        new_imgs = []

        for img in images:
            ext = os.path.splitext(img.filename)[1].lower()
            img_name = f"{uuid.uuid4()}{ext}"
            img_path = os.path.join(IMG_DIR, img_name)

            with open(img_path, "wb") as f:
                f.write(img.file.read())

            new_imgs.append(img_name)

        upd_vals["image_materi"] = json.dumps(new_imgs)

    if not upd_vals:
        return {"status": "nochange"}

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
    sql = text("""
        SELECT sa.id_student FROM student_access sa
        JOIN topik_materi tm ON tm.id_topik = sa.id_topik
        WHERE tm.id_materi = :id
        LIMIT 1
    """)
    rows = conn.execute(sql, {"id": id_materi}).first()

    if rows:
        raise HTTPException(400, "Tidak dapat menghapus: sudah diakses mahasiswa")

    conn.execute(
        MateriPembelajaran.delete().where(MateriPembelajaran.c.id_materi == id_materi)
    )
    return {"status": "ok"}
