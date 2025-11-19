# routes/topik_pembelajaran.py

from fastapi import APIRouter, HTTPException
from typing import List
from models.topik_pembelajaran import TopikPembelajaran
from database import database
from schemas.topik_pembelajaran import (
    TopikPembelajaranCreate,
    TopikPembelajaranUpdate,
    TopikPembelajaranResponse
)

router = APIRouter(
    prefix="/topik",
    tags=["Topik Pembelajaran"]
)


# ==========================================================
# GET /topik → Ambil semua topik
# ==========================================================
@router.get("/", response_model=List[TopikPembelajaranResponse])
async def get_all_topik():
    query = TopikPembelajaran.select()
    return await database.fetch_all(query)


# ==========================================================
# GET /topik/{id_topik} → Ambil 1 topik
# ==========================================================
@router.get("/{id_topik}", response_model=TopikPembelajaranResponse)
async def get_topik(id_topik: str):
    query = TopikPembelajaran.select().where(
        TopikPembelajaran.c.id_topik == id_topik
    )
    result = await database.fetch_one(query)

    if not result:
        raise HTTPException(status_code=404, detail="Topik tidak ditemukan")

    return result


# ==========================================================
# POST /topik → Tambah topik baru
# ==========================================================
@router.post("/", response_model=TopikPembelajaranResponse)
async def create_topik(topik: TopikPembelajaranCreate):
    query = TopikPembelajaran.insert().values(
        id_topik=topik.id_topik,
        nama_topik=topik.nama_topik,
        jml_mahasiswa=topik.jml_mahasiswa,
        deskripsi_topik=topik.deskripsi_topik,
        status_tayang=topik.status_tayang,
    )

    await database.execute(query)

    return topik


# ==========================================================
# PUT /topik/{id_topik} → Update topik
# ==========================================================
@router.put("/{id_topik}", response_model=TopikPembelajaranResponse)
async def update_topik(id_topik: str, topik: TopikPembelajaranUpdate):
    # cek apakah data ada
    find_query = TopikPembelajaran.select().where(
        TopikPembelajaran.c.id_topik == id_topik
    )
    existing = await database.fetch_one(find_query)

    if not existing:
        raise HTTPException(status_code=404, detail="Topik tidak ditemukan")

    # update
    update_query = TopikPembelajaran.update().where(
        TopikPembelajaran.c.id_topik == id_topik
    ).values(
        nama_topik=topik.nama_topik,
        jml_mahasiswa=topik.jml_mahasiswa,
        deskripsi_topik=topik.deskripsi_topik,
        status_tayang=topik.status_tayang,
    )

    await database.execute(update_query)

    updated = await database.fetch_one(find_query)
    return updated


# ==========================================================
# DELETE /topik/{id_topik} → Hapus topik
# ==========================================================
@router.delete("/{id_topik}")
async def delete_topik(id_topik: str):
    # cek dulu apakah ada datanya
    find_query = TopikPembelajaran.select().where(
        TopikPembelajaran.c.id_topik == id_topik
    )
    existing = await database.fetch_one(find_query)

    if not existing:
        raise HTTPException(status_code=404, detail="Topik tidak ditemukan")

    delete_query = TopikPembelajaran.delete().where(
        TopikPembelajaran.c.id_topik == id_topik
    )
    await database.execute(delete_query)

    return {"message": "Topik berhasil dihapus"}