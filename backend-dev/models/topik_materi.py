from sqlalchemy import Column, MetaData, String, DateTime, Table
from sqlalchemy.sql import func

metadata = MetaData()

TopikMateri = Table(
    "topik_materi", metadata,
    Column("id_topik", String(36), primary_key=True),
    Column("id_materi", String(36), primary_key=True),
    Column("created_at", DateTime(), nullable=False, server_default=func.current_timestamp()),
)
