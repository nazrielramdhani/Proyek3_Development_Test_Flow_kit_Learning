from pydantic import BaseModel, Field
from typing import Optional

# Schema untuk membuat data topik baru (digunakan pada endpoint CREATE)
class TopikCreate(BaseModel):
    nama_topik: str = Field(..., max_length=255)
    deskripsi_topik: Optional[str] = None

# Schema untuk meng-update data topik (digunakan pada endpoint UPDATE)
# Memerlukan id_topik sebagai identitas data yang ingin diubah
class TopikUpdate(BaseModel):
    id_topik: str
    nama_topik: Optional[str] = None
    deskripsi_topik: Optional[str] = None

# Schema untuk mengembalikan data topik ke client (digunakan pada endpoint GET)
# Berisi semua field yang biasanya ditampilkan saat membaca data
class TopikOut(BaseModel):
    id_topik: str
    nama_topik: str
    deskripsi_topik: Optional[str]
    jml_mahasiswa: Optional[int]
    status_tayang: int
