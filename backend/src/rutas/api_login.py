from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
import schemas
from controladores import logica_login

# Creamos el enrutador para agrupar estas URLs
router = APIRouter()

@router.post("/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Endpoint para iniciar sesión"""
    return logica_login.autenticar_usuario(db=db, request=request)

@router.post("/registro", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def registro(request: schemas.RegistroRequest, db: Session = Depends(get_db)):
    """Endpoint para que los pacientes se registren"""
    return logica_login.registrar_paciente(db=db, request=request)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_interno(request: schemas.UserCreate, db: Session = Depends(get_db)):
    """Endpoint interno para crear cuentas de administración"""
    return logica_login.registrar_usuario_interno(db=db, request=request)