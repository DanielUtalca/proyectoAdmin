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
    especialidad = Column(String(100), nullable=True)

class Cita(Base):
    __tablename__ = "citas"

    id_cita = Column(Integer, primary_key=True, index=True)
    rut_paciente = Column(String(50), nullable=True)
    nombre_paciente = Column(String(150), nullable=True)
    especialidad = Column(String(100), nullable=False)
    nombre_medico = Column(String(150), nullable=False)
    fecha_hora = Column(String(50), nullable=False) # Guardaremos ISO string o usaremos DateTime, usar String simplifica JSON por ahora
    estado = Column(String(20), nullable=False, default='DISPONIBLE') # 'DISPONIBLE', 'RESERVADA', 'CANCELADA'
    prioridad = Column(String(20), nullable=False, default='NORMAL') # 'NORMAL', 'ALTA'
    motivo_consulta = Column(String(500), nullable=True)
    tipo_cita = Column(String(50), nullable=False, default='Presencial') # 'Presencial', 'Telemedicina'
    enlace_telemedicina = Column(String(255), nullable=True)
    notas_clinicas = Column(String, nullable=True)

class Logistica(Base):
    __tablename__ = "logistica"

    id = Column(Integer, primary_key=True, index=True)
    rut_paciente = Column(String(50), index=True, nullable=False)
    nombre_paciente = Column(String(150), nullable=True)
    tipo = Column(String(50), nullable=False)          # 'Despacho', 'Visita'
    direccion = Column(String(255), nullable=False)
    detalle = Column(String(255), nullable=True)        # Ej. "Medicamentos A, B" o motivo de visita
    estado = Column(String(50), nullable=False, default='PENDIENTE')  # 'PENDIENTE', 'EN_CAMINO', 'COMPLETADO'
