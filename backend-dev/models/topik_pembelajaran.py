# models/topik_pembelajaran.py

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

TopikPembelajaran = Table(
    "ms_topik", metadata,
    Column("id_topik", String(255), primary_key=True, index=True),
    Column("nama_topik", String(255), nullable=False),
    Column("jml_mahasiswa", Integer),
    Column("deskripsi_topik", Text),
    Column("status_tayang", Integer, nullable=False, default=0),
    Column("created_at", DateTime),
    Column("updated_at", DateTime),
)
