# config/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from decouple import config

# Langsung ambil dari .env
SQLALCHEMY_DATABASE_URL = config('DATABASE_URL')

# Buat engine & session
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=True, autoflush=True, bind=engine)

Base = declarative_base()
conn = engine.connect().execution_options(autocommit=True)
