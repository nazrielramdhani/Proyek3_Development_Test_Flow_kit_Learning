from fastapi import APIRouter, HTTPException, Query, Path
from config.database import conn
from schemas.materi_pembelajaran import MateriCreate, MateriUpdate, MateriOut
from models.materi_pembelajaran import MateriPembelajaran
from sqlalchemy import select, text
import uuid

# Router utama untuk seluruh endpoint materi pembelajaran
router = APIRouter(prefix="", tags=["materi_pembelajaran"])


# ============================================================
# CREATE — Menambahkan materi pembelajaran baru
# ============================================================
@router.post("/materi")
def create_materi(payload: MateriCreate):
    # Generate ID unik untuk materi
    id_ = str(uuid.uuid4())

    # Query insert ke database
    ins = MateriPembelajaran.insert().values(
        id_materi=id_,
        judul_materi=payload.judul_materi,
        deskripsi_materi=payload.deskripsi_materi,
        jenis_materi=payload.jenis_materi,   # menyimpan jenis materi jika ada
        file_materi=payload.file_materi,
        text_materi=payload.text_materi,
        video_materi=payload.video_materi
    )
    conn.execute(ins)

    # Response sukses
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
# UPDATE — Memperbarui materi (hanya kolom yang dikirim saja)
# ============================================================
@router.put("/materi")
def update_materi(payload: MateriUpdate):
    # Ambil hanya field yang berubah (bukan None)
    upd_vals = {k: v for k, v in payload.dict().items() if v is not None and k != "id_materi"}

    # Jika tidak ada perubahan
    if not upd_vals:
        return {"status": "nochange"}

    # Jalankan update query
    upd = MateriPembelajaran.update().where(
        MateriPembelajaran.c.id_materi == payload.id_materi
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
