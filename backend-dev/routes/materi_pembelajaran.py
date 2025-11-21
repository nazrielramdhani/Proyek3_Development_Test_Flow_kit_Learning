# routes/materi_pembelajaran.py
from fastapi import APIRouter, HTTPException, Query, Path
from config.database import conn
from schemas.materi_pembelajaran import MateriCreate, MateriUpdate
from models.materi_pembelajaran import MateriPembelajaran
from sqlalchemy import select, text
import uuid

# Router utama untuk seluruh endpoint materi pembelajaran
router = APIRouter(prefix="", tags=["materi_pembelajaran"])


# ============================================================
# CREATE — Menambahkan materi pembelajaran baru
# ============================================================
@router.get("/materi")
def list_materi(keyword: str = "", page: int = 1, limit: int = 10):
    offset = (page - 1) * limit

    base_query = select(MateriPembelajaran).where(
        MateriPembelajaran.c.judul_materi.like(f"%{keyword}%")
    )

    # Hitung total data
    count_query = text(f"""
        SELECT COUNT(*) FROM ms_materi
        WHERE judul_materi LIKE :keyword
    """)
    total_data = conn.execute(count_query, {"keyword": f"%{keyword}%"}).scalar()
    max_page = (total_data // limit) + (1 if total_data % limit > 0 else 0)

    # Query data per halaman
    data_query = base_query.limit(limit).offset(offset)
    rows = conn.execute(data_query).mappings().all()

    return {
        "data": rows,
        "max_page": max_page
    }


# ============================================================
# READ — Mengambil seluruh data materi pembelajaran
# ============================================================
@router.get("/materi")
def list_all_materi():
    # Select semua kolom dari tabel ms_materi
    q = select(MateriPembelajaran)
    rows = conn.execute(q).mappings().all()
    return rows


# ============================================================
# READ by ID — Mengambil 1 materi berdasarkan id_materi
# ============================================================
@router.get("/materi/{id_materi}")
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
