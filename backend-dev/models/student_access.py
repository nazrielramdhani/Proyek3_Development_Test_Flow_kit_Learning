# models/student_access.py
from sqlalchemy import Column, MetaData, String, Table, DateTime, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime

metadata = MetaData()

StudentAccess = Table(
    "student_access",
    metadata,
    Column("id_student", String(255), ForeignKey("ms_student.ms_student_id"), primary_key=True),
    Column("id_topik", String(255), primary_key=True),
    Column("created_at", DateTime, default=datetime.now),
)
