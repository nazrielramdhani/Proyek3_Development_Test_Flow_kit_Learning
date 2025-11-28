from fastapi import APIRouter, HTTPException, Query, Path, UploadFile, File, Form
from config.database import conn
from schemas.materi_pembelajaran import MateriCreate, MateriUpdate, MateriOut
from models.materi_pembelajaran import MateriPembelajaran
from sqlalchemy import select, text
import uuid

# Router utama untuk seluruh endpoint materi pembelajaran
router = APIRouter(prefix="", tags=["materi_pembelajaran"])


# ============================================================
# CREATE — Upload file + simpan metadata
# ============================================================
@router.post("/materi")
def create_materi(
    judul_materi: str = Form(...),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(None),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None)
):
    id_ = str(uuid.uuid4())

    saved_filename = None
    if file_materi:
        # Validasi hanya file PDF
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF")

        saved_filename = f"{id_}.pdf"
        save_path = os.path.join(UPLOAD_DIR, saved_filename)

        # Simpan file PDF ke server
        with open(save_path, "wb") as f:
            f.write(file_materi.file.read())

    ins = MateriPembelajaran.insert().values(
        id_materi=id_,
        judul_materi=judul_materi,
        deskripsi_materi=deskripsi_materi,
        jenis_materi=jenis_materi,
        file_materi=saved_filename,
        text_materi=text_materi,
        video_materi=video_materi
    )
    conn.execute(ins)

    return {"status": "ok", "id_materi": id_}


# ============================================================
# READ — Mengambil seluruh data materi pembelajaran
# ============================================================
@router.get("/materi", response_model=list[MateriOut])
def list_all_materi():
    # Select semua kolom dari tabel ms_materi
    q = select(MateriPembelajaran)
    rows = conn.execute(q).mappings().all()
    # Return list of dict agar frontend menerima JSON murni
    return [dict(r) for r in rows]


# ============================================================
# READ by ID — Mengambil 1 materi berdasarkan id_materi
# ============================================================
@router.get("/materi/{id_materi}", response_model=MateriOut)
def get_materi(id_materi: str):
    # Query mencari materi berdasarkan ID
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    r = conn.execute(q).mappings().first()

    # Jika tidak ditemukan → error 404
    if not r:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")

    return dict(r)


# ============================================================
# UPDATE — Bisa ganti file PDF + update metadata
# ============================================================
@router.put("/materi")
def update_materi(
    id_materi: str = Form(...),
    judul_materi: str = Form(None),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(None),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None)
):
    upd_vals = {}

    # Tambahkan field hanya yang dikirim
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

    # Jika user ingin upload file baru
    if file_materi:
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF")

        new_filename = f"{id_materi}.pdf"
        save_path = os.path.join(UPLOAD_DIR, new_filename)

        with open(save_path, "wb") as f:
            f.write(file_materi.file.read())

        upd_vals["file_materi"] = new_filename

    if not upd_vals:
        return {"status": "nochange"}

    upd = MateriPembelajaran.update().where(
        MateriPembelajaran.c.id_materi == id_materi
    ).values(**upd_vals)

    conn.execute(upd)
    return {"status": "ok"}

# ============================================================
# DELETE — Menghapus materi berdasarkan id_materi
# Dengan validasi: materi tidak boleh dihapus jika sudah dipakai mahasiswa
# ============================================================
@router.delete("/materi/{id_materi}")
def delete_materi(id_materi: str = Path(...)):
    # Cek apakah materi sudah terhubung ke topik dan diakses mahasiswa
    sql = text("""
    SELECT sa.id_student FROM student_access sa
    JOIN topik_materi tm ON tm.id_topik = sa.id_topik
    WHERE tm.id_materi = :id
    LIMIT 1
    """)

    rows = conn.execute(sql, {"id": id_materi}).first()

    # Jika ada mahasiswa yang sudah mengakses → tidak boleh hapus
    if rows:
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus materi: sudah diakses oleh mahasiswa"
        )

    # Jika aman, lakukan delete
    delq = MateriPembelajaran.delete().where(
        MateriPembelajaran.c.id_materi == id_materi
    )
    conn.execute(delq)

    return {"status": "ok"}
