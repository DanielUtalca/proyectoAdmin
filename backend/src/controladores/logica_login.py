from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Usuario
import schemas

def _build_nombre_mostrar(usuario: Usuario) -> str:
    """Construye el nombre de visualización según el rol del usuario."""
    nombre = usuario.nombre or ""
    apellido = usuario.apellido or ""
    nombre_completo = f"{nombre} {apellido}".strip() or usuario.rut

    roles_profesionales = {"Director", "Trabajador", "Médico"}
    if usuario.rol in roles_profesionales:
        return f"Dr. {nombre_completo}"
    return nombre_completo

def autenticar_usuario(db: Session, request: schemas.LoginRequest):
    """Lógica para autenticar y devolver el usuario"""
    user = db.query(Usuario).filter(Usuario.rut == request.rut).first()

    if not user or user.password != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifique el RUT y la contraseña."
        )

    return schemas.LoginResponse(
        rut=user.rut,
        rol=user.rol,
        nombre_mostrar=_build_nombre_mostrar(user),
        message="Inicio de sesión exitoso"
    )

def registrar_paciente(db: Session, request: schemas.RegistroRequest):
    """Lógica para registrar un paciente con validaciones"""
    existing = db.query(Usuario).filter(Usuario.rut == request.rut).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya se encuentra registrado en el sistema."
        )

    existing_correo = db.query(Usuario).filter(Usuario.correo == request.correo).first()
    if existing_correo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está asociado a otra cuenta."
        )

    new_user = Usuario(
        rut=request.rut,
        password=request.password,
        rol="Paciente",  # Forzado siempre por el backend
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

def registrar_usuario_interno(db: Session, request: schemas.UserCreate):
    """Lógica para crear usuarios administrativos (Legacy)"""
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