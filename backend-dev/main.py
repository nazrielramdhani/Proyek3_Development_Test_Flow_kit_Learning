from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.auth import auth
from routes.cfg import cfg
from routes.student import student
from routes.teacher import teacher
from routes.batch import batch
from routes.modul import modul
from routes.topik import topik
from routes.combo import combo
from routes.grade import grade
from routes.progress import progress

from jobs.schedule import schedule_init, schedule_run_uncomplete, schedule_run_alpha
from jobs.train_model import run_train_model

from decouple import config
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import locale
import os

from sqlalchemy.sql import text
from config.database import conn
import uuid
from datetime import datetime

# --- Locale: aman untuk Windows & Linux ---
try:
    # Linux/macOS
    locale.setlocale(locale.LC_ALL, 'id_ID.utf8')
except Exception:
    try:
        # Windows
        locale.setlocale(locale.LC_ALL, 'Indonesian_Indonesia.1252')
    except Exception:
        # Jika tetap gagal, biarkan default locale
        pass

# Ubah ke /docs kalau mau default Swagger URL
app = FastAPI(docs_url="/doc")


def cors_headers(app: FastAPI) -> FastAPI:
    # Jika ingin lebih ketat, ganti allow_origins ke list tertentu:
    # contoh: ["http://localhost:5173", "http://127.0.0.1:5173"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
        expose_headers=["X-Already-Logged-In"],
    )
    return app


# --- Router ---
app.include_router(auth)
app.include_router(student)
# app.include_router(teacher)
# app.include_router(batch)
app.include_router(modul)
app.include_router(topik)
app.include_router(combo)
app.include_router(grade)
app.include_router(progress)
# app.include_router(cfg)

app = cors_headers(app)

# --- Static dir ---
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Files dir untuk PDF ---
if not os.path.exists("files"):
    os.makedirs("files")

app.mount("/files", StaticFiles(directory="files"), name="files")

# --- Materi uploaded dir untuk PDF dari teacher ---
if not os.path.exists("materi_uploaded"):
    os.makedirs("materi_uploaded")

app.mount("/materi_uploaded", StaticFiles(directory="materi_uploaded"), name="materi_uploaded")


@app.get("/")
async def root():
    return {"message": "SAS API version 1.1"}


@app.post("/api/topik/increment/{id_topik}")
def increment_topic_view(id_topik: str):
    try:
        # Define the SQL query to increment the count
        sql_update = text("UPDATE ms_topik SET jml_mahasiswa = jml_mahasiswa + 1 WHERE id_topik = :id")
        
        # Execute the update, passing the id_topik from the URL
        conn.execute(sql_update, {"id": id_topik})
        
        return {"status": "success", "message": f"Count for {id_topik} incremented."}
    except Exception as e:
        # Handle database errors
        return {"status": "error", "message": str(e)}

@app.get("/api/topik-pembelajaran")
def get_topik_pembelajaran():
    # Updated query: ONLY fetch from ms_topik
    # We removed the 'UNION ALL' part that was pulling from ms_materi
    sql_query = text("""
        SELECT 
            t.id_topik AS id, 
            t.nama_topik AS nama, 
            t.deskripsi_topik AS deskripsi, 
            'topic' AS type,
            (SELECT tm.id_materi 
             FROM topik_materi tm 
             WHERE tm.id_topik = t.id_topik 
             ORDER BY tm.created_at ASC 
             LIMIT 1) AS first_materi_id
        FROM ms_topik t
        WHERE t.status_tayang = 1
    """)
    
    try:
        results = conn.execute(sql_query).mappings().all()
        return {"topik": results}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/topik/{id_topik}/materials")
def get_materials_by_topic(id_topik: str):
    """
    Get all materials for a specific topic.
    Returns materials with Indonesian field names matching the database structure.
    """
    sql_query = text("""
        SELECT 
            m.id_materi,
            m.judul_materi,
            m.deskripsi_materi,
            m.jenis_materi,
            m.file_materi,
            m.text_materi,
            m.video_materi,
            m.created_at,
            m.updated_at
        FROM ms_materi m
        INNER JOIN topik_materi tm ON m.id_materi = tm.id_materi
        WHERE tm.id_topik = :id_topik
        ORDER BY tm.created_at ASC
    """)
    try:
        results = conn.execute(sql_query, {"id_topik": id_topik}).mappings().all()
        return {"materials": results}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/materi")
def create_materi(
    judul_materi: str = Form(...),
    deskripsi_materi: str = Form(None),
    jenis_materi: str = Form(...),
    text_materi: str = Form(None),
    video_materi: str = Form(None),
    file_materi: UploadFile = File(None)
):
    """
    Create new materi pembelajaran.
    jenis_materi must be one of: 'text', 'pdf', 'video'
    """
    # Validasi jenis_materi
    if jenis_materi not in ['text', 'pdf', 'video']:
        raise HTTPException(status_code=400, detail="jenis_materi harus 'text', 'pdf', atau 'video'")
    
    # Validasi content sesuai jenis
    if jenis_materi == 'pdf' and not file_materi:
        raise HTTPException(status_code=400, detail="file_materi wajib untuk jenis PDF")
    if jenis_materi == 'text' and not text_materi:
        raise HTTPException(status_code=400, detail="text_materi wajib untuk jenis text")
    if jenis_materi == 'video' and not video_materi:
        raise HTTPException(status_code=400, detail="video_materi wajib untuk jenis video")
    
    id_materi = str(uuid.uuid4())
    saved_filename = None
    
    # Handle PDF file upload
    if file_materi:
        # Validasi hanya file PDF
        if not file_materi.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File harus berformat PDF")
        
        saved_filename = f"{id_materi}.pdf"
        save_path = os.path.join("materi_uploaded", saved_filename)
        
        # Simpan file PDF ke server dengan size limit (10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        file_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        
        with open(save_path, "wb") as f:
            while chunk := file_materi.file.read(chunk_size):
                file_size += len(chunk)
                if file_size > max_size:
                    # Hapus file yang sudah tertulis sebagian
                    f.close()
                    if os.path.exists(save_path):
                        os.remove(save_path)
                    raise HTTPException(status_code=413, detail="File terlalu besar (maksimal 10MB)")
                f.write(chunk)
    
    # Insert ke database dengan transaction
    insert_query = text("""
        INSERT INTO ms_materi (
            id_materi, judul_materi, deskripsi_materi, jenis_materi,
            file_materi, text_materi, video_materi, created_at, updated_at
        ) VALUES (
            :id_materi, :judul_materi, :deskripsi_materi, :jenis_materi,
            :file_materi, :text_materi, :video_materi, :created_at, :updated_at
        )
    """)
    
    trans = conn.begin()
    try:
        conn.execute(insert_query, {
            "id_materi": id_materi,
            "judul_materi": judul_materi,
            "deskripsi_materi": deskripsi_materi,
            "jenis_materi": jenis_materi,
            "file_materi": saved_filename,
            "text_materi": text_materi,
            "video_materi": video_materi,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        })
        trans.commit()
        
        return {
            "status": "ok",
            "message": "Materi berhasil dibuat",
            "id_materi": id_materi
        }
    except Exception as e:
        trans.rollback()
        # Jika gagal dan file sudah diupload, hapus file
        if saved_filename and os.path.exists(os.path.join("materi_uploaded", saved_filename)):
            os.remove(os.path.join("materi_uploaded", saved_filename))
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
# --- Jadwal (nonaktif, aktifkan kalau diperlukan) ---
# @app.on_event('startup')
# def init_data():
#     schedule_init()
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(run_train_model, 'cron', hour='01', minute='00')
#     scheduler.add_job(schedule_run_uncomplete, 'cron', hour='01', minute='00')
#     scheduler.add_job(schedule_run_alpha, 'cron', hour='21', minute='00')
#     scheduler.start()


if __name__ == "__main__":
    # BACA HOST & PORT dari .env dengan CAST yang benar
    HOST = config("HOST", default="0.0.0.0")
    PORT = config("PORT_APP", cast=int, default=3000)  # <= penting: cast=int
    uvicorn.run(app, host=HOST, port=PORT)