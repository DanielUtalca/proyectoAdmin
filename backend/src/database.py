import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cesfam_user:cesfam_secure_password@localhost:5432/cesfam")
INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME")

# Si se detecta la conexión a Cloud SQL (GCP), armamos la URL usando sockets de Unix
if INSTANCE_CONNECTION_NAME:
    db_user = os.getenv("DB_USER", "cesfam_user")
    db_pass = os.getenv("DB_PASS", "cesfam_secure_password")
    db_name = os.getenv("DB_NAME", "cesfam")
    DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_pass}@/{db_name}?host=/cloudsql/{INSTANCE_CONNECTION_NAME}"
else:
    # Compatibilidad para URLs de base de datos que comiencen con postgres:// (por ejemplo en Heroku/Render)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependencia para obtener la sesión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
