# routes/materi_pembelajaran.py

import os
import uuid
import json
from datetime import datetime
from distutils.dir_util import copy_tree, remove_tree

from fastapi import APIRouter, Response, status, UploadFile, File, Depends, Request, Form
from fastapi.responses import FileResponse
from middleware.auth_bearer import JWTBearer
from utilities.utils import getDataFromJwt, dataTypeValidation
from sqlalchemy.sql import text

from config.database import conn
from models.materi_pembelajaran import MateriPembelajaran
from models.topik_pembelajaran import TopikPembelajaran
from models.topik_modul import TopikModul
from models.topik_materi import topik_materi as TopikMateriModel  # jika ada model topik_materi
from decouple import config
import magic

router = APIRouter()
# jika proyek mengimpor router lain sebagai modul, nama variabel bisa disesuaikan:
materi = APIRouter()

# -----------------------------------------
# Helper: ensure materials folder
# -----------------------------------------
def ensure_material_folder(id_materi: str):
    base = "materials"
    folder = os.path.join(base, id_materi)
    if not os.path.exists(base):
        os.makedirs(base)
    if not os.path.exists(folder):
        os.makedirs(folder)
    return folder

# -----------------------------------------
# 1. Search / list materi (pagination)
# -----------------------------------------
@materi.get("/materi/search", dependencies=[Depends(JWTBearer())])
async def search_materi(limit: int = 10, page: int = 1, keyword: str = None):
    if keyword:
        keyword_q = "%" + keyword + "%"
    else:
        keyword_q = "%"

    if page < 1:
        page = 1
    offset = (page - 1) * limit

    base_q = "SELECT m.* FROM ms_materi m WHERE m.judul_materi LIKE :keyword OR IFNULL(m.deskripsi_materi,'') LIKE :keyword"
    total_query = text(base_q)
    all_rows = conn.execute(total_query, keyword=keyword_q).fetchall()

    paged_q = text(base_q + " LIMIT :l OFFSET :o")
    rows = conn.execute(paged_q, keyword=keyword_q, l=limit, o=offset).fetchall()

    max_page = (len(all_rows) + limit - 1) // limit if limit > 0 else 1
    return {"limit": limit, "page": page, "offset": offset, "total": len(all_rows), "max_page": max_page, "data": rows}

# -----------------------------------------
# 2. Get materi detail by id
# -----------------------------------------
@materi.get("/materi/{id_materi}", dependencies=[Depends(JWTBearer())])
async def get_materi(id_materi: str, response: Response):
    query = MateriPembelajaran.select().where(MateriPembelajaran.c.id_materi == id_materi)
    data = conn.execute(query).fetchone()
    if data is None:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {"message": "data tidak ditemukan"}
    return {"message": "sukses", "data": data}

# -----------------------------------------
# 3. Add materi (form-data; optional file)
#    uses multipart/form-data:
#    Fields: judul_materi (str), deskripsi_materi (str opt), jenis_materi (str), file_materi (UploadFile optional)
# -----------------------------------------
@materi.post("/materi/add", dependencies=[Depends(JWTBearer())])
async def add_materi(request: Request,
                    judul_materi: str = Form(...),
                    deskripsi_materi: str = Form(None),
                    jenis_materi: str = Form("default"),
                    file_materi: UploadFile = None,
                    response: Response = None):
    currentUser = getDataFromJwt(request)
    id_materi = str(uuid.uuid4())

    file_name_db = None
    try:
        # handle file if present
        if file_materi is not None:
            folder = ensure_material_folder(id_materi)
            filename = file_materi.filename
            target = os.path.join(folder, filename)
            with open(target, "wb") as f:
                f.write(await file_materi.read())
            file_name_db = filename

        query = MateriPembelajaran.insert().values(
            id_materi=id_materi,
            judul_materi=judul_materi,
            deskripsi_materi=deskripsi_materi,
            jenis_materi=jenis_materi,
            file_materi=file_name_db,
            text_materi=None,
            video_materi=None,
            created_at=datetime.today(),
            updated_at=datetime.today()
        )
        conn.execute(query)
        conn.execute(text("COMMIT;"))
        return {"message": "sukses menambahkan materi", "id_materi": id_materi}
    except Exception as e:
        # cleanup if file saved
        try:
            if file_name_db:
                remove_tree(os.path.join("materials", id_materi))
        except:
            pass
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"message": "Error saat tambah materi", "detail": str(e)}

# -----------------------------------------
# 4. Edit materi
# -----------------------------------------
@materi.put("/materi/edit", dependencies=[Depends(JWTBearer())])
async def edit_materi(request: Request,
                      id_materi: str = Form(...),
                      judul_materi: str = Form(None),
                      deskripsi_materi: str = Form(None),
                      jenis_materi: str = Form(None),
                      file_materi: UploadFile = None,
                      response: Response = None):
    currentUser = getDataFromJwt(request)

    query_get = MateriPembelajaran.select().where(MateriPembelajaran.c.id_materi == id_materi)
    prev = conn.execute(query_get).fetchone()
    if prev is None:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {"message": "materi tidak ditemukan"}

    updates = {}
    if judul_materi is not None:
        updates["judul_materi"] = judul_materi
    if deskripsi_materi is not None:
        updates["deskripsi_materi"] = deskripsi_materi
    if jenis_materi is not None:
        updates["jenis_materi"] = jenis_materi
    # handle file replacement
    if file_materi is not None:
        folder = ensure_material_folder(id_materi)
        filename = file_materi.filename
        target = os.path.join(folder, filename)
        # save new file
        with open(target, "wb") as f:
            f.write(await file_materi.read())
        # remove old file if name different
        if prev.file_materi and prev.file_materi != filename:
            old_path = os.path.join(folder, prev.file_materi)
            if os.path.exists(old_path):
                os.remove(old_path)
        updates["file_materi"] = filename

    if updates:
        updates["updated_at"] = datetime.today()
        query_update = MateriPembelajaran.update().values(**updates).where(MateriPembelajaran.c.id_materi == id_materi)
        conn.execute(query_update)
        conn.execute(text("COMMIT;"))

    return {"message": "sukses update materi", "id_materi": id_materi}

# -----------------------------------------
# 5. Delete materi
# -----------------------------------------
@materi.delete("/materi/delete", dependencies=[Depends(JWTBearer())])
async def delete_materi(request: Request, id_materi: str, response: Response):
    # check usage in topik_materi
    q_check = text("SELECT * FROM topik_materi WHERE id_materi = :id")
    used = conn.execute(q_check, id=id_materi).fetchall()
    if len(used) > 0:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"message": "materi tidak dapat dihapus karena sedang digunakan di topik"}

    # delete DB
    q_del = MateriPembelajaran.delete().where(MateriPembelajaran.c.id_materi == id_materi)
    conn.execute(q_del)
    conn.execute(text("COMMIT;"))
    # delete files folder if exists
    folder = os.path.join("materials", id_materi)
    if os.path.exists(folder):
        remove_tree(folder)
    return {"message": "sukses hapus materi", "id_materi": id_materi}

# -----------------------------------------
# 6. Download file
# -----------------------------------------
@materi.get("/materi/download/{id_materi}/{filename}", dependencies=[Depends(JWTBearer())])
async def download_materi(id_materi: str, filename: str):
    file_path = os.path.join("materials", id_materi, filename)
    if not os.path.exists(file_path):
        return {"message": "file tidak ada"}
    mime = magic.Magic(mime=True)
    return FileResponse(path=file_path, filename=filename, media_type=mime.from_file(file_path))

# -----------------------------------------
# 7. List materi by topik (via topik_materi)
# -----------------------------------------
@materi.get("/materi/byTopik/{id_topik}", dependencies=[Depends(JWTBearer())])
async def materi_by_topik(id_topik: str):
    q = text("""
        SELECT tm.nomor_urutan, m.*
        FROM topik_materi tm
        JOIN ms_materi m ON tm.id_materi = m.id_materi
        WHERE tm.id_topik = :id_topik
        ORDER BY tm.nomor_urutan ASC
    """)
    rows = conn.execute(q, id_topik=id_topik).fetchall()
    return {"data": rows}
