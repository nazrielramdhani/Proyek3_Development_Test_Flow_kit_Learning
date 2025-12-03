from pydantic import BaseModel
from typing import Optional, List

class MateriCreate(BaseModel):
    judul_materi: str
    deskripsi_materi: Optional[str] = None
    file_materi: Optional[str] = None
    image_materi: Optional[List[str]] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
    jenis_materi: Optional[str] = "default"

class MateriUpdate(BaseModel):
    id_materi: str
    judul_materi: Optional[str] = None
    deskripsi_materi: Optional[str] = None
    file_materi: Optional[str] = None
    image_materi: Optional[List[str]] = None
    text_materi: Optional[str] = None
    video_materi: Optional[str] = None
    jenis_materi: Optional[str] = None 

class MateriOut(BaseModel):
    id_materi: str
    judul_materi: str
    deskripsi_materi: Optional[str]
    file_materi: Optional[str]
    image_materi: Optional[List[str]]
    text_materi: Optional[str]
    video_materi: Optional[str]
    jenis_materi: Optional[str]
