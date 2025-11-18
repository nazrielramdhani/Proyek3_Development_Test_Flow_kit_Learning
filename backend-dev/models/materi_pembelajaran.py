# models/materi_pembelajaran.py

from sqlalchemy import (
    Column,
    MetaData,
    String,
    Table,
    Integer,
    Text
)
from sqlalchemy.sql.sqltypes import DateTime

metadata = MetaData()

MateriPembelajaran = Table(
    "ms_materi", metadata,
    Column("id_materi", String(255), primary_key=True, index=True),
    Column("judul_materi", String(255), nullable=False),
    Column("deskripsi_materi", Text),
    Column("jenis_materi", String(50), nullable=False, default="default"),
    Column("jml_mahasiswa", Integer),
    Column("file_materi", Text),
    Column("text_materi", Text),
    Column("video_materi", Text),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
