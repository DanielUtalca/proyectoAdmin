import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cesfam_user:cesfam_secure_password@localhost:5432/cesfam")

# Soporte para Docker Secrets: leer la contraseña del archivo
db_password_file = os.getenv("DB_PASSWORD_FILE")
if db_password_file and os.path.exists(db_password_file):
    with open(db_password_file, "r") as f:
        secret_password = f.read().strip()
    
    # Inyectar la contraseña si la URL de conexión base no la incluye explícitamente pero tiene '@'
    if "@" in DATABASE_URL and ":" not in DATABASE_URL.split("@")[0].split("://")[1]:
        parts = DATABASE_URL.split("@")
        DATABASE_URL = f"{parts[0]}:{secret_password}@{parts[1]}"
    # Fallback simplificado por si hay una password que sobreescribir (cesfam_secure_password)
    elif "cesfam_secure_password" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("cesfam_secure_password", secret_password)

INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME")

# Si se detecta la conexión a Cloud SQL (GCP), armamos la URL usando sockets de Unix
if INSTANCE_CONNECTION_NAME:
    db_user = os.getenv("DB_USER", "cesfam_user")
    db_pass = os.getenv("DB_PASS", "cesfam_secure_password")
    db_name = os.getenv("DB_NAME", "cesfam")
    
    # Sobrescribir con Docker Secret si existe
    if db_password_file and os.path.exists(db_password_file):
        db_pass = secret_password
        
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
