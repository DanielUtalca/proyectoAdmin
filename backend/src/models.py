from sqlalchemy import Column, Integer, String
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  # En texto plano temporalmente para pruebas
    rol = Column(String(50), nullable=False)        # Director, Trabajador, Médico, Paciente
    nombre = Column(String(100), nullable=True)
    apellido = Column(String(100), nullable=True)
    correo = Column(String(150), nullable=True)
    telefono = Column(String(20), nullable=True)
    direccion = Column(String(255), nullable=True)
