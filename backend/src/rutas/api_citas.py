from fastapi import APIRouter, Depends, HTTPException, Query, Body, Form, File, UploadFile
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Cita, Usuario, Logistica, Receta
from schemas import CitaResponse, CrearCitaRequest, CrearLogisticaRequest, LogisticaResponse, AtenderCitaRequest, CrearRecetaRequest, RecetaResponse

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
        motivo_consulta=req.motivo_consulta,
        tipo_cita=req.tipo_cita or 'Presencial'
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)

    if nueva_cita.tipo_cita == 'Telemedicina':
        nueva_cita.enlace_telemedicina = f"https://meet.jit.si/cesfam-telemedicina-{nueva_cita.rut_paciente}-{nueva_cita.id_cita}"
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
def atender_cita(id_cita: int, req: Optional[AtenderCitaRequest] = Body(None), db: Session = Depends(get_db)):
    """Marca una cita como ATENDIDA. Solo aplica a citas en estado RESERVADA."""
    cita = db.query(Cita).filter(Cita.id_cita == id_cita).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.estado != "RESERVADA":
        raise HTTPException(status_code=400, detail="Solo se pueden atender citas en estado RESERVADA")

    cita.estado = "ATENDIDA"
    if req and req.notas_clinicas is not None:
        cita.notas_clinicas = req.notas_clinicas
    db.commit()
    db.refresh(cita)
    return cita

# ─────────────────────────────────────────────
# Endpoints de Logística
# ─────────────────────────────────────────────

@router.post("/logistica", response_model=LogisticaResponse)
def crear_logistica(
    rut_paciente: str = Form(...),
    nombre_paciente: Optional[str] = Form(None),
    tipo: str = Form(...),
    direccion: Optional[str] = Form(None),
    detalle: Optional[str] = Form(None),
    latitud: Optional[float] = Form(None),
    longitud: Optional[float] = Form(None),
    evidencia: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Crea una nueva orden de logística (despacho de medicamentos o visita domiciliaria).
    Acepta coordenadas latitud/longitud opcionales obtenidas desde Nominatim (OpenStreetMap)."""
    if evidencia:
        print(f"Archivo recibido: {evidencia.filename}")

    direc_final = direccion
    if not direc_final or not direc_final.strip():
        # Intentamos obtener la dirección del perfil del paciente
        paciente = db.query(Usuario).filter(Usuario.rut == rut_paciente).first()
        if paciente and paciente.direccion:
            direc_final = paciente.direccion
        else:
            direc_final = "Dirección no registrada"

    nueva_orden = Logistica(
        rut_paciente=rut_paciente,
        nombre_paciente=nombre_paciente,
        tipo=tipo,
        direccion=direc_final,
        detalle=detalle,
        estado="PENDIENTE",
        latitud=latitud,
        longitud=longitud,
    )
    db.add(nueva_orden)
    db.commit()
    db.refresh(nueva_orden)
    return nueva_orden


@router.get("/logistica", response_model=list[LogisticaResponse])
def get_logistica(db: Session = Depends(get_db)):
    """Retorna todas las órdenes de logística registradas"""
    return db.query(Logistica).order_by(Logistica.id.desc()).all()

@router.put("/logistica/estado/{id}", response_model=LogisticaResponse)
def actualizar_estado_logistica(id: int, estado: str = Query(..., description="PENDIENTE, EN_CAMINO o COMPLETADO"), db: Session = Depends(get_db)):
    """Actualiza el estado de una orden de logística"""
    orden = db.query(Logistica).filter(Logistica.id == id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de logística no encontrada")
    
    estado_upper = estado.upper()
    if estado_upper not in ["PENDIENTE", "EN_CAMINO", "COMPLETADO"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
        
    orden.estado = estado_upper
    db.commit()
    db.refresh(orden)
    return orden


# ─────────────────────────────────────────────
# Endpoints de Estadísticas para los Dashboards
# ─────────────────────────────────────────────

@router.get("/stats/medico/{nombre_medico}")
def get_stats_medico(nombre_medico: str, db: Session = Depends(get_db)):
    """Retorna KPIs reales para el dashboard del médico."""
    from datetime import date
    hoy = date.today().isoformat()

    total_hoy = db.query(Cita).filter(
        Cita.nombre_medico == nombre_medico,
        Cita.fecha_hora.startswith(hoy),
        Cita.estado.in_(["RESERVADA", "ATENDIDA"])
    ).count()

    atendidas_hoy = db.query(Cita).filter(
        Cita.nombre_medico == nombre_medico,
        Cita.fecha_hora.startswith(hoy),
        Cita.estado == "ATENDIDA"
    ).count()

    teleconsultas_pendientes = db.query(Cita).filter(
        Cita.nombre_medico == nombre_medico,
        Cita.tipo_cita == "Telemedicina",
        Cita.estado == "RESERVADA"
    ).count()

    proxima_teleconsulta = db.query(Cita).filter(
        Cita.nombre_medico == nombre_medico,
        Cita.tipo_cita == "Telemedicina",
        Cita.estado == "RESERVADA"
    ).order_by(Cita.fecha_hora).first()

    return {
        "total_pacientes_hoy": total_hoy,
        "atendidas_hoy": atendidas_hoy,
        "teleconsultas_pendientes": teleconsultas_pendientes,
        "proxima_teleconsulta": {
            "nombre_paciente": proxima_teleconsulta.nombre_paciente,
            "fecha_hora": proxima_teleconsulta.fecha_hora
        } if proxima_teleconsulta else None
    }


@router.get("/stats/paciente/{rut}")
def get_stats_paciente(rut: str, db: Session = Depends(get_db)):
    """Retorna KPIs reales para el dashboard del paciente."""
    from datetime import datetime

    ahora_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    proxima_cita = db.query(Cita).filter(
        Cita.rut_paciente == rut,
        Cita.estado == "RESERVADA",
        Cita.fecha_hora >= ahora_str
    ).order_by(Cita.fecha_hora).first()

    citas_virtuales_pendientes = db.query(Cita).filter(
        Cita.rut_paciente == rut,
        Cita.tipo_cita == "Telemedicina",
        Cita.estado == "RESERVADA"
    ).count()

    despachos_pendientes = db.query(Logistica).filter(
        Logistica.rut_paciente == rut,
        Logistica.estado == "PENDIENTE"
    ).count()

    def formatear_fecha(fecha_hora_str):
        """Convierte 'YYYY-MM-DD HH:MM' a un string legible."""
        try:
            dt = datetime.strptime(fecha_hora_str, "%Y-%m-%d %H:%M")
            dias = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
            meses = ["enero","febrero","marzo","abril","mayo","junio",
                     "julio","agosto","septiembre","octubre","noviembre","diciembre"]
            return f"{dias[dt.weekday()]} {dt.day} de {meses[dt.month-1]} a las {dt.strftime('%H:%M')}"
        except:
            return fecha_hora_str

    return {
        "proxima_cita": {
            "nombre_medico": proxima_cita.nombre_medico,
            "especialidad": proxima_cita.especialidad,
            "fecha_hora": proxima_cita.fecha_hora,
            "fecha_legible": formatear_fecha(proxima_cita.fecha_hora),
            "tipo_cita": proxima_cita.tipo_cita
        } if proxima_cita else None,
        "citas_virtuales_pendientes": citas_virtuales_pendientes,
        "despachos_pendientes": despachos_pendientes
    }


# ─────────────────────────────────────────────
# Endpoints de Recetas
# ─────────────────────────────────────────────

@router.post("/recetas", response_model=RecetaResponse)
def crear_receta(req: CrearRecetaRequest, db: Session = Depends(get_db)):
    """Crea una receta electrónica en el sistema. Si la modalidad de entrega
    es 'Despacho a Domicilio', también inserta automáticamente la orden
    en el módulo de logística."""
    nueva_receta = Receta(
        rut_paciente=req.rut_paciente,
        nombre_paciente=req.nombre_paciente,
        nombre_medico=req.nombre_medico,
        fecha=req.fecha,
        medicamentos=req.medicamentos,
        indicaciones=req.indicaciones,
        modalidad_entrega=req.modalidad_entrega
    )
    db.add(nueva_receta)
    db.commit()
    db.refresh(nueva_receta)

    if req.modalidad_entrega == "Despacho a Domicilio":
        # Creamos la orden en logística
        detalle_despacho = f"Receta #{nueva_receta.id}: {req.medicamentos}"
        if req.indicaciones:
            detalle_despacho += f" | {req.indicaciones}"
            
        direc_final = req.direccion
        if not direc_final or not direc_final.strip():
            # Buscar dirección del perfil
            paciente = db.query(Usuario).filter(Usuario.rut == req.rut_paciente).first()
            if paciente and paciente.direccion:
                direc_final = paciente.direccion
            else:
                direc_final = "Dirección no registrada"

        nueva_orden = Logistica(
            rut_paciente=req.rut_paciente,
            nombre_paciente=req.nombre_paciente,
            tipo="Despacho",
            direccion=direc_final,
            detalle=detalle_despacho[:254],  # Truncar a 254 caracteres para cumplir la longitud de la BD
            estado="PENDIENTE",
            latitud=req.latitud,
            longitud=req.longitud
        )
        db.add(nueva_orden)
        db.commit()

    return nueva_receta


@router.get("/recetas/paciente/{rut}", response_model=list[RecetaResponse])
def get_recetas_paciente(rut: str, db: Session = Depends(get_db)):
    """Retorna el historial de recetas de un paciente específico, ordenadas por fecha descendente."""
    return db.query(Receta).filter(Receta.rut_paciente == rut).order_by(Receta.id.desc()).all()

