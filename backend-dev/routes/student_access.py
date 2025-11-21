# routes/student_access.py
from fastapi import APIRouter, HTTPException
from config.database import conn
from models.student_access import StudentAccess
from sqlalchemy import select

router = APIRouter(prefix="", tags=["student_access"])

@router.post("/student/access")
def record_access(payload: dict):
    id_student = payload.get("id_student")
    id_topik = payload.get("id_topik")
    if not id_student or not id_topik:
        raise HTTPException(status_code=400, detail="id_student dan id_topik required")
    # insert if not exists
    q = select(StudentAccess).where(StudentAccess.c.id_student == id_student, StudentAccess.c.id_topik == id_topik)
    if not conn.execute(q).first():
        conn.execute(StudentAccess.insert().values(id_student=id_student, id_topik=id_topik))
    return {"status":"ok"}
