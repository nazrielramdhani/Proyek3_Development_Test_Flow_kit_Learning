from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ==========================================================
# Base Schema untuk Read (response)
# ==========================================================
class TopikPembelajaranBase(BaseModel):
    id_topik: str
    nama_topik: str
    jml_mahasiswa: Optional[int] = None
    deskripsi_topik: Optional[str] = None
    status_tayang: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ==========================================================
# Schema untuk Create
# ==========================================================
class TopikPembelajaranCreate(BaseModel):
    nama_topik: str
    jml_mahasiswa: Optional[int] = None
    deskripsi_topik: Optional[str] = None
    status_tayang: Optional[int] = 0


# ==========================================================
# Schema untuk Update
# ==========================================================
class TopikPembelajaranUpdate(BaseModel):
    nama_topik: Optional[str] = None
    jml_mahasiswa: Optional[int] = None
    deskripsi_topik: Optional[str] = None
    status_tayang: Optional[int] = None
