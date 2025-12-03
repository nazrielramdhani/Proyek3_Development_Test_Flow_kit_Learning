from sqlalchemy import Column, MetaData, String, Integer, Text, DateTime, Table
from sqlalchemy.sql import func

metadata = MetaData()

MateriPembelajaran = Table(
    "ms_materi", metadata,
    Column("id_materi", String(36), primary_key=True, index=True),
    Column("judul_materi", String(255), nullable=False),
    Column("deskripsi_materi", Text),
    Column("jenis_materi", String(50), nullable=False, server_default="default"),
    Column("file_materi", Text),   # file PDF
    Column("image_materi", Text),  # JSON array
    Column("text_materi", Text),
    Column("video_materi", Text),
    Column("created_at", DateTime(), nullable=False, server_default=func.current_timestamp()),
    Column("updated_at", DateTime(), nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp()),
)
