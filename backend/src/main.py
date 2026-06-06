import os
import sys
from contextlib import asynccontextmanager

# Asegurar que el directorio de src esté en el PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, Base, get_db, SessionLocal
from models import Usuario, Cita

# IMPORTANTE: Importamos nuestras nuevas rutas
from rutas import api_login, api_citas

# Forzar la creación de tablas
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        if db.query(Usuario).count() == 0:
            test_users = [
                Usuario(
                    rut="12.345.678-9", password="password123", rol="Director",
                    nombre="María", apellido="González", correo="maria@cesfam.cl",
                    telefono="+56912345678", direccion="Calle Principal 123"
                ),
                Usuario(
                    rut="11.222.333-4", password="password123", rol="Trabajador",
                    nombre="Carlos", apellido="Ramírez", correo="carlos@cesfam.cl",
                    telefono="+56987654321", direccion="Av. Los Aromos 456"
                ),
                Usuario(
                    rut="9.876.543-2", password="password123", rol="Paciente",
                    nombre="Juan", apellido="Pérez", correo="juan@gmail.com",
                    telefono="+56911111111", direccion="Pasaje Los Pinos 789"
                ),
                Usuario(
                    rut="14.444.555-6", password="password123", rol="Médico",
                    nombre="Andrés", apellido="Castro", especialidad="Medicina General",
                    correo="andres@cesfam.cl", telefono="+56922223333", direccion="Av. Central 789"
                ),
                Usuario(
                    rut="15.555.666-7", password="password123", rol="Médico",
                    nombre="Antonia", apellido="Vega", especialidad="Pediatría",
                    correo="antonia@cesfam.cl", telefono="+56933334444", direccion="Paseo del Valle 456"
                ),
            ]
            db.add_all(test_users)
            db.commit()
            print("[Startup] Base de datos sembrada exitosamente con usuarios de prueba.")
            
        if db.query(Cita).count() == 0:
            # Sembramos solo UNA cita de ejemplo para que el médico tenga algo que ver en su panel
            # El nuevo sistema crea citas dinámicamente desde el calendario del paciente.
            test_citas = [
                Cita(
                    especialidad="Pediatría", nombre_medico="Dr. Antonia Vega",
                    fecha_hora="2024-12-11 16:30", estado="RESERVADA",
                    rut_paciente="9.876.543-2", nombre_paciente="Juan Pérez",
                    motivo_consulta="Control sano niño"
                )
            ]
            db.add_all(test_citas)
            db.commit()
            print("[Startup] Cita de prueba sembrada exitosamente.")
    except Exception as e:
        print(f"[Startup] Advertencia al sembrar base de datos: {e}")
    finally:
        db.close()
    yield

# Inicializar la aplicación
app = FastAPI(
    title="CESFAM API",
    description="Backend del Sistema de Gestión Clínica CESFAM",
    version="2.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# CONECTAMOS LAS RUTAS EXTERNAS
# ─────────────────────────────────────────────
app.include_router(api_login.router, prefix="/api", tags=["Autenticación"])
app.include_router(api_citas.router, prefix="/api", tags=["Citas"])

# ─────────────────────────────────────────────
# Endpoints Generales
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "API FastAPI funcionando correctamente y ordenada",
        "description": "Bienvenido al backend de CESFAM",
        "version": "2.0.0"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Base de datos no disponible: {str(e)}"
        )