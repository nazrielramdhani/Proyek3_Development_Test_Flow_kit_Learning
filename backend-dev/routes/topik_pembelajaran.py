from fastapi import APIRouter, HTTPException, Query, Body
from config.database import conn
from schemas.topik_pembelajaran import TopikCreate, TopikUpdate, TopikOut
from models.topik_pembelajaran import TopikPembelajaran
from models.topik_materi import TopikMateri
from models.student_access import StudentAccess
from sqlalchemy import select, text
import uuid

router = APIRouter(prefix="", tags=["topik_pembelajaran"])

# ============================================================
# GET LIST TOPIK PEMBELAJARAN
# ============================================================
@router.get("/topik-pembelajaran", response_model=list[TopikOut])
def list_topik():
    # Mengambil semua data topik
    q = select(TopikPembelajaran)
    res = conn.execute(q).mappings().all()
    return [dict(r) for r in res]

# ============================================================
# CREATE TOPIK PEMBELAJARAN
# ============================================================
@router.post("/topik-pembelajaran")
def create_topik(payload: TopikCreate):
    # Generate UUID untuk id_topik
    id_ = str(uuid.uuid4())

    # Query INSERT untuk menambah topik baru
    ins = TopikPembelajaran.insert().values(
        id_topik=id_, 
        nama_topik=payload.nama_topik, 
        deskripsi_topik=payload.deskripsi_topik
    )

    conn.execute(ins)

    return {"status": "ok", "id_topik": id_}

# ============================================================
# UPDATE TOPIK PEMBELAJARAN (UPDATE FIELD TERTENTU)
# ============================================================
@router.put("/topik-pembelajaran")
def update_topik(payload: TopikUpdate):

    # Ambil hanya field yang tidak None dan bukan id_topik
    upd_vals = {k: v for k, v in payload.dict().items() if v is not None and k != "id_topik"}

    # Jika tidak ada perubahan, langsung return
    if not upd_vals:
        return {"status": "nochange"}

    # Query UPDATE berdasarkan id_topik
    upd = TopikPembelajaran.update()\
        .where(TopikPembelajaran.c.id_topik == payload.id_topik)\
        .values(**upd_vals)

    conn.execute(upd)
    return {"status": "ok"}

# ============================================================
# PUBLISH TOPIK (SET status_tayang = 1)
# ============================================================
@router.put("/topik-pembelajaran/publish")
def publish_topik(id_topik: str = Query(...)):
    # Update status topik menjadi 1 (published)
    upd = TopikPembelajaran.update()\
        .where(TopikPembelajaran.c.id_topik == id_topik)\
        .values(status_tayang=1)

    conn.execute(upd)
    return {"status": "ok"}

# ============================================================
# TAKE DOWN TOPIK (SET status_tayang = 0)
# Hanya boleh jika belum pernah diakses mahasiswa
# ============================================================
@router.put("/topik-pembelajaran/takedown")
def takedown_topik(id_topik: str = Query(...)):

    # Cek apakah topik sudah pernah diakses oleh mahasiswa
    q = select(StudentAccess).where(StudentAccess.c.id_topik == id_topik)
    rows = conn.execute(q).first()

    # Jika pernah diakses → tidak boleh di-takedown
    if rows:
        raise HTTPException(
            status_code=400, 
            detail="Tidak bisa take down: sudah diakses oleh mahasiswa"
        )

    # Jika aman → lakukan update status_tayang = 0
    upd = TopikPembelajaran.update()\
        .where(TopikPembelajaran.c.id_topik == id_topik)\
        .values(status_tayang=0)

    conn.execute(upd)
    return {"status": "ok"}

# ============================================================
# LIST MATERI DALAM SATU TOPIK (urut menurut nomor_urutan bila ada)
# ============================================================
@router.get("/topik-pembelajaran/{id_topik}/materi")
def list_materi_for_topik(id_topik: str):
    # Query raw SQL untuk mendapatkan semua materi terkait topik
    # Urut berdasarkan nomor_urutan jika kolom ada, fallback ke created_at
    sql = text("""
        SELECT m.*, tm.nomor_urutan
        FROM ms_materi m
        JOIN topik_materi tm ON tm.id_materi = m.id_materi
        WHERE tm.id_topik = :id
        ORDER BY COALESCE(tm.nomor_urutan, 0) ASC, tm.created_at ASC
    """)

    rows = conn.execute(sql, {"id": id_topik}).mappings().all()
    return {"data": [dict(r) for r in rows]}

# ============================================================
# TAMBAHKAN MATERI KE DALAM TOPIK (sederhana: insert satu mapping)
# ============================================================
@router.post("/topik-pembelajaran/{id_topik}/materi")
def add_materi_to_topik(id_topik: str, id_materi: str):
    # Insert relasi topik → materi ke tabel topik_materi
    # Jika ingin mengontrol nomor_urutan gunakan endpoint mapping di bawah
    ins = TopikMateri.insert().values(id_topik=id_topik, id_materi=id_materi)
    conn.execute(ins)
    return {"status":"ok"}

# ============================================================
# REPLACE / UPDATE MAPPING MATERI UNTUK SATU TOPIK
# ============================================================
@router.put("/topik-pembelajaran/{id_topik}/materi/mapping")
def replace_materi_mapping(id_topik: str, payload: dict = Body(...)):
    """
    payload expected:
    {
      "list_materi": [
         {"id_materi": "...", "nomor_urutan": 1},
         ...
      ]
    }
    """
    list_materi = payload.get("list_materi", [])
    # 1) Hapus mapping lama untuk topik
    delq = TopikMateri.delete().where(TopikMateri.c.id_topik == id_topik)
    conn.execute(delq)

    # 2) Insert mapping baru (bulk) — set nomor_urutan jika ada, default 1
    ins_values = []
    for idx, m in enumerate(list_materi):
        ins_values.append({
            "id_topik": id_topik,
            "id_materi": m.get("id_materi"),
            "nomor_urutan": int(m.get("nomor_urutan") or (idx + 1))
        })

    if ins_values:
        conn.execute(TopikMateri.insert(), ins_values)

    return {"status":"ok", "count": len(ins_values)}

# ============================================================
# DELETE TOPIK PEMBELAJARAN
# Tidak boleh dihapus jika:
# - Topik sudah pernah diakses mahasiswa
# ============================================================
@router.delete("/topik-pembelajaran")
def delete_topik(id_topik: str = Query(...)):
    
    # 1. Cek apakah topik pernah diakses mahasiswa
    q_access = select(StudentAccess).where(StudentAccess.c.id_topik == id_topik)
    rows_access = conn.execute(q_access).first()

    if rows_access:
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus topik: sudah diakses oleh mahasiswa."
        )

    # 2. Hapus relasi topik → materi (jika ada)
    del_rel = TopikMateri.delete().where(TopikMateri.c.id_topik == id_topik)
    conn.execute(del_rel)

    # 3. Hapus topiknya
    del_topik = TopikPembelajaran.delete().where(TopikPembelajaran.c.id_topik == id_topik)
    result = conn.execute(del_topik)

    try:
        rowcount = result.rowcount
    except Exception:
        rowcount = None

    if rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Topik tidak ditemukan."
        )

    return {"status": "ok", "message": "Topik berhasil dihapus"}
