from pydantic import BaseModel
from typing import Optional

# Schema untuk membuat materi baru (request body POST)
class MateriCreate(BaseModel):
    judul_materi: str
    deskripsi_materi: Optional[str] = None
    file_materi: Optional[str] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
    jenis_materi: Optional[str] = "default"  

# Schema untuk update materi (request body PUT)
class MateriUpdate(BaseModel):
    id_materi: str
    judul_materi: Optional[str] = None
    deskripsi_materi: Optional[str] = None
    file_materi: Optional[str] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
    jenis_materi: Optional[str] = None 

# Schema output materi ke frontend (response format)
class MateriOut(BaseModel):
    id_materi: str
    judul_materi: str
    deskripsi_materi: Optional[str]
    file_materi: Optional[str]
    text_materi: Optional[str]
    video_materi: Optional[str]
    jenis_materi: Optional[str] 
