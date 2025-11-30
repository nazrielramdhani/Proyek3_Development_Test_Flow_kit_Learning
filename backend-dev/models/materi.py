from sqlalchemy import Table, Column
from sqlalchemy.sql.sqltypes import Integer, String, DateTime, Text
from config.database import meta, engine

Materi = Table(
    'ms_materi', meta,
    Column('id_materi', String(36), primary_key=True),
    Column('judul_materi', String(255), nullable=False),
    Column('deskripsi_materi', Text, nullable=True),
    Column('jenis_materi', String(20), nullable=False),  # 'text', 'pdf', 'video'
    Column('file_materi', Text, nullable=True),
    Column('text_materi', Text, nullable=True),
    Column('video_materi', Text, nullable=True),
    Column('created_at', DateTime, nullable=False),
    Column('updated_at', DateTime, nullable=False)
)

meta.create_all(engine)
