from fastapi import FastAPI, HTTPException
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
app = FastAPI(
    title="Test Flow Kit Learning API",
    description="API untuk aplikasi pembelajaran berbasis test coverage",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


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

@app.get(
    "/api/topik-pembelajaran",
    tags=["Topik Pembelajaran"],
    summary="Get all published topics",
    response_description="List of published learning topics"
)
def get_topik_pembelajaran():
    """
    Mengambil semua topik pembelajaran yang sudah dipublish.
    
    Returns:
    - **topik**: Array of topic objects dengan first_materi_id
    """
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


@app.get(
    "/api/topik/{id_topik}/materials",
    tags=["Materi Pembelajaran"],
    summary="Get all materials for a topic",
    response_description="List of materials for the specified topic"
)
def get_materials_by_topic(id_topik: str):
    """
    Mengambil semua materi pembelajaran untuk topik tertentu.
    
    - **id_topik**: ID topik yang ingin diambil materinya
    
    Returns:
    - **materials**: Array of material objects with Indonesian field names
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