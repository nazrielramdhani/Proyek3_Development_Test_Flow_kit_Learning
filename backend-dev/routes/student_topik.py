# routes/student_topik.py
from fastapi import APIRouter, Depends
from sqlalchemy.sql import text
from config.database import engine
from middleware.auth_bearer import JWTBearer

router = APIRouter(
    prefix="",
    tags=["student_topik"],
    dependencies=[Depends(JWTBearer())]
)

@router.get("/topik_pembelajaran")
def student_list_published_topik():
    sql = text("""
        SELECT  
            t.id_topik AS id,
            t.nama_topik AS nama,
            t.deskripsi_topik AS deskripsi,
            'topic' AS type,
            (
                SELECT tm.id_materi
                FROM topik_materi tm
                WHERE tm.id_topik = t.id_topik
                ORDER BY tm.created_at ASC
                LIMIT 1
            ) AS first_materi_id
        FROM ms_topik t
        WHERE t.status_tayang = 1
        ORDER BY t.created_at DESC
    """)

    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()

    return {"topik": [dict(r) for r in rows]}
