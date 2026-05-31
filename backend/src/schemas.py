from pydantic import BaseModel, field_validator, EmailStr
from typing import Optional


# ─────────────────────────────────────────────
# Esquemas de Login
# ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    rut: str
    password: str


class LoginResponse(BaseModel):
    rut: str
    rol: str
    nombre_mostrar: str
    message: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Esquemas de Registro
# ─────────────────────────────────────────────

class RegistroRequest(BaseModel):
    rut: str
    password: str
    nombre: str
    apellido: str
    correo: EmailStr
    telefono: str
    direccion: str

    @field_validator('rut')
    @classmethod
    def validate_rut(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El RUT no puede estar vacío.")
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres.")
        return v

    @field_validator('nombre', 'apellido')
    @classmethod
    def validate_nombre(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("El campo debe tener al menos 2 caracteres.")
        return v

    @field_validator('telefono')
    @classmethod
    def validate_telefono(cls, v: str) -> str:
        digits = v.replace('+', '').replace(' ', '').replace('-', '')
        if not digits.isdigit() or len(digits) < 8:
            raise ValueError("El teléfono debe contener al menos 8 dígitos.")
        return v


# ─────────────────────────────────────────────
# Esquemas de respuesta de usuario (CRUD)
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    """Uso interno / admin: permite especificar el rol manualmente."""
    rut: str
    password: str
    rol: str

    @field_validator('rol')
    @classmethod
    def validate_rol(cls, v: str) -> str:
        roles_validos = ["Director", "Trabajador", "Médico", "Paciente"]
        if v not in roles_validos:
            raise ValueError(f"El rol debe ser uno de: {', '.join(roles_validos)}")
        return v


class UserResponse(BaseModel):
    id: int
    rut: str
    rol: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    correo: Optional[str] = None

    class Config:
        from_attributes = True
