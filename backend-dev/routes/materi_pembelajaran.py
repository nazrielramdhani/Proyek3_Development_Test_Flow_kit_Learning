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
@router.post("/materi")
def create_materi(payload: MateriCreate):
    id_ = str(uuid.uuid4())
    ins = MateriPembelajaran.insert().values(
        id_materi=id_,
        judul_materi=payload.judul_materi,
        deskripsi_materi=payload.deskripsi_materi,
        file_materi=payload.file_materi,
        text_materi=payload.text_materi,
        video_materi=payload.video_materi
    )
    conn.execute(ins)
    return {"status": "ok", "id_materi": id_}


# ============================================================
# READ — Mengambil seluruh data materi pembelajaran
# ============================================================
@router.get("/materi")
def list_all_materi():
    q = select(MateriPembelajaran)
    rows = conn.execute(q).mappings().all()
    return rows


# ============================================================
# READ by ID — Mengambil 1 materi berdasarkan id_materi
# ============================================================
@router.get("/materi/{id_materi}")
def get_materi(id_materi: str):
    q = select(MateriPembelajaran).where(MateriPembelajaran.c.id_materi == id_materi)
    r = conn.execute(q).mappings().first()
    if not r:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    return dict(r)


# ============================================================
# UPDATE — Memperbarui materi
# ============================================================
@router.put("/materi")
def update_materi(payload: MateriUpdate):
    upd_vals = {k: v for k, v in payload.dict().items() if v is not None and k != "id_materi"}
    if not upd_vals:
        return {"status": "nochange"}

    upd = MateriPembelajaran.update().where(
        MateriPembelajaran.c.id_materi == payload.id_materi
    ).values(**upd_vals)

    conn.execute(upd)
    return {"status": "ok"}


# ============================================================
# PUBLISH MATERI — Set materi menjadi aktif / published
# ============================================================
@router.put("/materi/publish")
def publish_materi(id_materi: str = Query(...)):
    upd = MateriPembelajaran.update()\
        .where(MateriPembelajaran.c.id_materi == id_materi)\
        .values(jenis_materi="published")

    conn.execute(upd)
    return {"status": "ok", "message": "Materi berhasil dipublish"}


# ============================================================
# TAKEDOWN MATERI — Menonaktifkan materi
# Tidak boleh jika sudah diakses mahasiswa
# ============================================================
@router.put("/materi/takedown")
def takedown_materi(id_materi: str = Query(...)):

    # Cek apakah materi sudah terhubung ke topik dan diakses
    sql = text("""
    SELECT sa.id_student FROM student_access sa
    JOIN topik_materi tm ON tm.id_topik = sa.id_topik
    WHERE tm.id_materi = :id
    LIMIT 1
    """)

    rows = conn.execute(sql, {"id": id_materi}).first()

    if rows:
        raise HTTPException(
            status_code=400,
            detail="Materi tidak dapat ditakedown: sudah diakses oleh mahasiswa"
        )

    # Jika aman, ubah status materi menjadi inactive
    upd = MateriPembelajaran.update()\
        .where(MateriPembelajaran.c.id_materi == id_materi)\
        .values(jenis_materi="inactive")

    conn.execute(upd)
    return {"status": "ok", "message": "Materi berhasil ditakedown"}


# ============================================================
# DELETE — Menghapus materi dari database
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
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus materi: sudah diakses oleh mahasiswa"
        )

    delq = MateriPembelajaran.delete().where(
        MateriPembelajaran.c.id_materi == id_materi
    )
    conn.execute(delq)

    return {"status": "ok"}
