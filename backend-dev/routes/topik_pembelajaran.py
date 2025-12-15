from fastapi import APIRouter, HTTPException, Query, Body
from config.database import engine  # cukup pakai engine di file ini
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
    q = select(TopikPembelajaran)
    with engine.connect() as conn:
        res = conn.execute(q).mappings().all()
        return [dict(r) for r in res]


# ============================================================
# CREATE TOPIK PEMBELAJARAN
# ============================================================
@router.post("/topik-pembelajaran")
def create_topik(payload: TopikCreate):
    id_ = str(uuid.uuid4())

    ins = TopikPembelajaran.insert().values(
        id_topik=id_,
        nama_topik=payload.nama_topik,
        deskripsi_topik=payload.deskripsi_topik,
    )

    with engine.begin() as conn:
        conn.execute(ins)

    return {"status": "ok", "id_topik": id_}


# ============================================================
# UPDATE TOPIK PEMBELAJARAN (UPDATE FIELD TERTENTU)
# ============================================================
@router.put("/topik-pembelajaran")
def update_topik(payload: TopikUpdate):
    upd_vals = {
        k: v for k, v in payload.dict().items()
        if v is not None and k != "id_topik"
    }

    if not upd_vals:
        return {"status": "nochange"}

    upd = (
        TopikPembelajaran.update()
        .where(TopikPembelajaran.c.id_topik == payload.id_topik)
        .values(**upd_vals)
    )

    with engine.begin() as conn:
        conn.execute(upd)

    return {"status": "ok"}


# ============================================================
# PUBLISH TOPIK (SET status_tayang = 1)
# ============================================================
@router.put("/topik-pembelajaran/publish")
def publish_topik(id_topik: str = Query(...)):
    upd = (
        TopikPembelajaran.update()
        .where(TopikPembelajaran.c.id_topik == id_topik)
        .values(status_tayang=1)
    )

    with engine.begin() as conn:
        conn.execute(upd)

    return {"status": "ok"}


# ============================================================
# TAKE DOWN TOPIK (SET status_tayang = 0)
# ============================================================
@router.put("/topik-pembelajaran/takedown")
def takedown_topik(id_topik: str = Query(...)):
    with engine.connect() as conn:
        q = select(StudentAccess).where(StudentAccess.c.id_topik == id_topik)
        rows = conn.execute(q).first()

    if rows:
        raise HTTPException(
            status_code=400,
            detail="Tidak bisa take down: sudah diakses oleh mahasiswa",
        )

    upd = (
        TopikPembelajaran.update()
        .where(TopikPembelajaran.c.id_topik == id_topik)
        .values(status_tayang=0)
    )

    with engine.begin() as conn:
        conn.execute(upd)

    return {"status": "ok"}


# ============================================================
# LIST MATERI DALAM SATU TOPIK (urut menurut nomor_urutan)
# ============================================================
@router.get("/topik-pembelajaran/{id_topik}/materi")
def list_materi_for_topik(id_topik: str):
    sql = text("""
        SELECT
            m.id_materi,
            m.judul_materi,
            m.deskripsi_materi,
            m.jenis_materi,
            m.file_materi,
            m.text_materi,
            m.video_materi,
            tm.nomor_urutan
        FROM ms_materi m
        JOIN topik_materi tm ON tm.id_materi = m.id_materi
        WHERE tm.id_topik = :id
        ORDER BY tm.nomor_urutan ASC, tm.created_at ASC
    """)

    with engine.connect() as conn:
        rows = conn.execute(sql, {"id": id_topik}).mappings().all()

    return {"data": [dict(r) for r in rows]}

# ============================================================
# TAMBAHKAN MATERI KE DALAM TOPIK
# ============================================================
@router.post("/topik-pembelajaran/{id_topik}/materi")
def add_materi_to_topik(id_topik: str, id_materi: str):
    ins = TopikMateri.insert().values(
        id_topik=id_topik,
        id_materi=id_materi,
    )

    with engine.begin() as conn:
        conn.execute(ins)

    return {"status": "ok"}


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
    list_materi = payload.get("list_materi", []) or []

    with engine.begin() as conn:
        # hapus mapping lama
        delq = TopikMateri.delete().where(TopikMateri.c.id_topik == id_topik)
        conn.execute(delq)

        # insert mapping baru
        ins_values = []
        for idx, m in enumerate(list_materi):
            ins_values.append({
                "id_topik": id_topik,
                "id_materi": m.get("id_materi"),
                "nomor_urutan": int(m.get("nomor_urutan") or (idx + 1)),
            })

        if ins_values:
            conn.execute(TopikMateri.insert(), ins_values)

    return {"status": "ok", "count": len(ins_values)}


# ============================================================
# DELETE TOPIK PEMBELAJARAN
# ============================================================
@router.delete("/topik-pembelajaran")
def delete_topik(id_topik: str = Query(...)):
    with engine.connect() as conn:
        q_access = select(StudentAccess).where(StudentAccess.c.id_topik == id_topik)
        rows_access = conn.execute(q_access).first()

    if rows_access:
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus topik: sudah diakses oleh mahasiswa.",
        )

    with engine.begin() as conn:
        del_rel = TopikMateri.delete().where(TopikMateri.c.id_topik == id_topik)
        conn.execute(del_rel)

        del_topik = TopikPembelajaran.delete().where(
            TopikPembelajaran.c.id_topik == id_topik
        )
        result = conn.execute(del_topik)

        try:
            rowcount = result.rowcount
        except Exception:
            rowcount = None

    if rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Topik tidak ditemukan.",
        )

    return {"status": "ok", "message": "Topik berhasil dihapus"}