# models/student_access.py
from sqlalchemy import Column, MetaData, String, DateTime, Table
from sqlalchemy.sql import func

metadata = MetaData()

StudentAccess = Table(
    "student_access", metadata,
    Column("id_student", String(36), primary_key=True),
    Column("id_topik", String(36), primary_key=True),
    Column("created_at", DateTime(), nullable=False, server_default=func.current_timestamp()),
)
