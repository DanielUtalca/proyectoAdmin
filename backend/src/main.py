import os
import sys
from contextlib import asynccontextmanager

# Asegurar que el directorio de src esté en el PYTHONPATH para evitar problemas de importación
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, Base, get_db, SessionLocal
from models import Usuario
from schemas import LoginRequest, LoginResponse, RegistroRequest, UserCreate, UserResponse

# Forzar la creación de tablas de la base de datos al importar/iniciar
# Usa checkfirst=True para no eliminar datos existentes; añade columnas nuevas si la tabla ya existe
Base.metadata.create_all(bind=engine)


def _build_nombre_mostrar(usuario: Usuario) -> str:
    """Construye el nombre de visualización según el rol del usuario."""
    nombre = usuario.nombre or ""
    apellido = usuario.apellido or ""
    nombre_completo = f"{nombre} {apellido}".strip() or usuario.rut

    roles_profesionales = {"Director", "Trabajador", "Médico"}
    if usuario.rol in roles_profesionales:
        return f"Dr. {nombre_completo}"
    return nombre_completo


# Contexto de ciclo de vida para sembrar datos de prueba en la base de datos al iniciar
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
            ]
            db.add_all(test_users)
            db.commit()
            print("[Startup] Base de datos sembrada exitosamente con usuarios de prueba.")
    except Exception as e:
        print(f"[Startup] Advertencia al sembrar base de datos: {e}")
    finally:
        db.close()
    yield


# Inicializar la aplicación FastAPI con el ciclo de vida
app = FastAPI(
    title="CESFAM API",
    description="Backend del Sistema de Gestión Clínica CESFAM",
    version="2.0.0",
    lifespan=lifespan
)

# Configurar el middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Endpoints Generales
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "status": "API FastAPI funcionando correctamente",
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


# ─────────────────────────────────────────────
# Autenticación
# ─────────────────────────────────────────────

@app.post("/api/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Autentica al usuario con RUT y contraseña.
    Devuelve el rol y el nombre_mostrar construido según el rol.
    """
    user = db.query(Usuario).filter(Usuario.rut == request.rut).first()

    if not user or user.password != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifique el RUT y la contraseña."
        )

    return LoginResponse(
        rut=user.rut,
        rol=user.rol,
        nombre_mostrar=_build_nombre_mostrar(user),
        message="Inicio de sesión exitoso"
    )


@app.post("/api/registro", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def registro(request: RegistroRequest, db: Session = Depends(get_db)):
    """Registra un nuevo usuario. El rol siempre se fuerza a 'Paciente'."""
    existing = db.query(Usuario).filter(Usuario.rut == request.rut).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya se encuentra registrado en el sistema."
        )

    # Verificar que el correo no esté duplicado
    existing_correo = db.query(Usuario).filter(Usuario.correo == request.correo).first()
    if existing_correo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está asociado a otra cuenta."
        )

    new_user = Usuario(
        rut=request.rut,
        password=request.password,
        rol="Paciente",           # Forzado siempre por el backend
        nombre=request.nombre,
        apellido=request.apellido,
        correo=request.correo,
        telefono=request.telefono,
        direccion=request.direccion,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ─────────────────────────────────────────────
# Usuarios (admin/legacy)
# ─────────────────────────────────────────────

@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserCreate, db: Session = Depends(get_db)):
    """Endpoint legacy — crea usuarios con rol explícito (uso interno/admin)."""
    existing = db.query(Usuario).filter(Usuario.rut == request.rut).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya se encuentra registrado."
        )

    new_user = Usuario(
        rut=request.rut,
        password=request.password,
        rol=request.rol
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
