from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Cita, Usuario
from schemas import CitaResponse, CrearCitaRequest

router = APIRouter()

# ─────────────────────────────────────────────
# Catálogo
# ─────────────────────────────────────────────

@router.get("/medicos")
def get_medicos(db: Session = Depends(get_db)):
    """Lista todos los médicos con su especialidad para los dropdowns del paciente."""
    medicos = db.query(Usuario).filter(Usuario.rol == "Médico").all()
    return [
        {
            "nombre_completo": f"Dr. {m.nombre} {m.apellido}",
            "especialidad": m.especialidad or "General"
        }
        for m in medicos
    ]

# ─────────────────────────────────────────────
# Endpoints del Paciente
# ─────────────────────────────────────────────

@router.get("/citas/ocupadas")
def get_citas_ocupadas(
    medico: str = Query(..., description="Nombre completo del médico"),
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Retorna las horas ya ocupadas (HH:MM) de un médico en una fecha específica."""
    citas = db.query(Cita).filter(
        Cita.nombre_medico == medico,
        Cita.fecha_hora.startswith(fecha),
        Cita.estado.in_(["RESERVADA", "ATENDIDA"])
    ).all()

    horas_ocupadas = []
    for c in citas:
        partes = c.fecha_hora.split(" ")
        if len(partes) >= 2:
            horas_ocupadas.append(partes[1])

    return {"ocupadas": horas_ocupadas}

@router.get("/citas/mis-citas/{rut}", response_model=list[CitaResponse])
def get_mis_citas(rut: str, db: Session = Depends(get_db)):
    """Retorna todas las citas de un paciente, ordenadas por fecha."""
    citas = db.query(Cita).filter(Cita.rut_paciente == rut).all()
    citas.sort(key=lambda c: c.fecha_hora)
    return citas

@router.post("/citas/agendar", response_model=CitaResponse)
def crear_cita(req: CrearCitaRequest, db: Session = Depends(get_db)):
    """Crea una nueva cita reservando el bloque horario. Verifica que no exista duplicado."""
    # Verificar que el bloque no esté ya ocupado (race condition protection)
    existente = db.query(Cita).filter(
        Cita.nombre_medico == req.nombre_medico,
        Cita.fecha_hora == req.fecha_hora,
        Cita.estado.in_(["RESERVADA", "ATENDIDA"])
    ).first()

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Este bloque ya fue reservado por otro paciente. Por favor elige otro."
        )

    nueva_cita = Cita(
        rut_paciente=req.rut_paciente,
        nombre_paciente=req.nombre_paciente,
        especialidad=req.especialidad,
        nombre_medico=req.nombre_medico,
        fecha_hora=req.fecha_hora,
        estado="RESERVADA",
        prioridad=req.prioridad,
        motivo_consulta=req.motivo_consulta
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita

@router.put("/citas/cancelar/{id_cita}", response_model=CitaResponse)
def cancelar_cita(id_cita: int, db: Session = Depends(get_db)):
    """Cancela una cita y libera el bloque horario (vuelve a DISPONIBLE)."""
    cita = db.query(Cita).filter(Cita.id_cita == id_cita).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    cita.rut_paciente = None
    cita.nombre_paciente = None
    cita.motivo_consulta = None
    cita.estado = "DISPONIBLE"
    db.commit()
    db.refresh(cita)
    return cita

# ─────────────────────────────────────────────
# Endpoints del Médico
# ─────────────────────────────────────────────

@router.get("/citas/mi-agenda-medico/{nombre_medico}", response_model=list[CitaResponse])
def get_agenda_medico(nombre_medico: str, db: Session = Depends(get_db)):
    """Retorna todas las citas de un médico (RESERVADA y ATENDIDA), ordenadas por fecha."""
    citas = db.query(Cita).filter(
        Cita.nombre_medico == nombre_medico,
        Cita.estado.in_(["RESERVADA", "ATENDIDA"])
    ).all()
    citas.sort(key=lambda c: c.fecha_hora)
    return citas

@router.put("/citas/atender/{id_cita}", response_model=CitaResponse)
def atender_cita(id_cita: int, db: Session = Depends(get_db)):
    """Marca una cita como ATENDIDA. Solo aplica a citas en estado RESERVADA."""
    cita = db.query(Cita).filter(Cita.id_cita == id_cita).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.estado != "RESERVADA":
        raise HTTPException(status_code=400, detail="Solo se pueden atender citas en estado RESERVADA")

    cita.estado = "ATENDIDA"
    db.commit()
    db.refresh(cita)
    return cita
