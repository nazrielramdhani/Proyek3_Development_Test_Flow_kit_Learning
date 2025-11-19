# schemas/materi_pembelajaran.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ==========================================================
# Base Schema untuk Read (response)
# ==========================================================
class MateriPembelajaranBase(BaseModel):
    id_materi: str
    judul_materi: str
    deskripsi_materi: Optional[str] = None
    jenis_materi: str
    jml_mahasiswa: Optional[int] = None
    file_materi: Optional[str] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ==========================================================
# Schema untuk Create
# ==========================================================
class MateriPembelajaranCreate(BaseModel):
    judul_materi: str
    deskripsi_materi: Optional[str] = None
    jenis_materi: Optional[str] = "default"
    jml_mahasiswa: Optional[int] = None
    file_materi: Optional[str] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None


# ==========================================================
# Schema untuk Update
# ==========================================================
class MateriPembelajaranUpdate(BaseModel):
    judul_materi: Optional[str] = None
    deskripsi_materi: Optional[str] = None
    jenis_materi: Optional[str] = None
    jml_mahasiswa: Optional[int] = None
    file_materi: Optional[str] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
