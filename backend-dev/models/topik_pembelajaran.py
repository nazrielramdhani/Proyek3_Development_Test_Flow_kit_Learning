from sqlalchemy import Column, MetaData, String, Integer, Text, DateTime, Table
from sqlalchemy.sql import func

metadata = MetaData()

TopikPembelajaran = Table(
    "ms_topik", metadata,
    Column("id_topik", String(36), primary_key=True, index=True),
    Column("nama_topik", String(255), nullable=False),
    Column("jml_mahasiswa", Integer, nullable=True, server_default="0"),
    Column("deskripsi_topik", Text),
    Column("status_tayang", Integer, nullable=False, server_default="0"),  # 0=draft,1=published
    Column("created_at", DateTime(), nullable=False, server_default=func.current_timestamp()),
    Column("updated_at", DateTime(), nullable=False, server_default=func.current_timestamp()),
)