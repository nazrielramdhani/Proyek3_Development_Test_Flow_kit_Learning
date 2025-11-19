from fastapi import FastAPI
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
from routes.topik_pembelajaran import topik_pembelajaran

from jobs.schedule import schedule_init, schedule_run_uncomplete, schedule_run_alpha
from jobs.train_model import run_train_model

from decouple import config
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import locale
import os

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
app.include_router(topik_pembelajaran)
# app.include_router(cfg)

app = cors_headers(app)

# --- Static dir ---
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"message": "SAS API version 1.1"}


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
