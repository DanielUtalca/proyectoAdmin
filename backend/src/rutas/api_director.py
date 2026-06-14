from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import io
import csv
import psutil
import platform
import time
from database import get_db
from models import Usuario, Cita, Logistica, Receta

router = APIRouter()

@router.get("/director/dashboard-stats", tags=["Director"])
def get_director_dashboard_stats(db: Session = Depends(get_db)):
    try:
        # Total pacientes registrados
        total_pacientes = db.query(Usuario).filter(Usuario.rol == 'Paciente').count()
        # Total médicos registrados
        total_medicos = db.query(Usuario).filter(Usuario.rol == 'Médico').count()
        # Total de citas en el sistema
        total_citas = db.query(Cita).count()
        
        # Citas presenciales vs telemedicina
        citas_presenciales = db.query(Cita).filter(Cita.tipo_cita == 'Presencial').count()
        citas_telemedicina = db.query(Cita).filter(Cita.tipo_cita == 'Telemedicina').count()
        
        # Citas por estado
        citas_reservadas = db.query(Cita).filter(Cita.estado == 'RESERVADA').count()
        citas_disponibles = db.query(Cita).filter(Cita.estado == 'DISPONIBLE').count()
        citas_canceladas = db.query(Cita).filter(Cita.estado == 'CANCELADA').count()
        
        # Entregas logísticas (despachos y visitas)
        logistica_despachos = db.query(Logistica).filter(Logistica.tipo == 'Despacho').count()
        logistica_visitas = db.query(Logistica).filter(Logistica.tipo == 'Visita').count()
        
        # Recetas totales emitidas
        total_recetas = db.query(Receta).count()
        
        # Especialidades con citas agendadas
        especialidades = db.query(Cita.especialidad).distinct().all()
        especialidades_data = []
        for esp in especialidades:
            name = esp[0]
            if not name:
                continue
            count = db.query(Cita).filter(Cita.especialidad == name).count()
            especialidades_data.append({"name": name, "value": count})
            
        # En caso de no haber especialidades, ponemos valores por defecto para evitar gráficos vacíos
        if not especialidades_data:
            especialidades_data = [
                {"name": "Medicina General", "value": 0},
                {"name": "Pediatría", "value": 0}
            ]
            
        return {
            "total_pacientes": total_pacientes,
            "total_medicos": total_medicos,
            "total_citas": total_citas,
            "citas_tipo": {
                "presencial": citas_presenciales,
                "telemedicina": citas_telemedicina
            },
            "citas_estado": {
                "reservadas": citas_reservadas,
                "disponibles": citas_disponibles,
                "canceladas": citas_canceladas
            },
            "logistica": {
                "despachos": logistica_despachos,
                "visitas": logistica_visitas
            },
            "total_recetas": total_recetas,
            "especialidades": especialidades_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas del director: {str(e)}"
        )

@router.get("/director/reportes/export", tags=["Director"])
def export_minsal_report(db: Session = Depends(get_db)):
    try:
        citas = db.query(Cita).all()
        
        output = io.StringIO()
        # Escribir UTF-8 BOM para soporte correcto en Excel (español/acentos en Windows)
        output.write('\ufeff')
        
        writer = csv.writer(output, delimiter=';')
        writer.writerow([
            "ID Cita", "RUT Paciente", "Nombre Paciente", "Especialidad",
            "Médico", "Fecha y Hora", "Estado", "Prioridad", "Tipo de Cita", "Motivo Consulta"
        ])
        
        for cita in citas:
            writer.writerow([
                cita.id_cita,
                cita.rut_paciente or "N/A",
                cita.nombre_paciente or "N/A",
                cita.especialidad,
                cita.nombre_medico,
                cita.fecha_hora,
                cita.estado,
                cita.prioridad,
                cita.tipo_cita,
                cita.motivo_consulta or "Sin especificar"
            ])
            
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=RMA_Reporte_Mensual_Atenciones.csv"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al exportar reporte Minsal: {str(e)}"
        )

@router.get("/director/reportes/preview", tags=["Director"])
def get_report_preview(db: Session = Depends(get_db)):
    try:
        # Obtener las últimas 15 citas registradas para mostrarlas en la tabla del frontend
        citas = db.query(Cita).order_by(Cita.id_cita.desc()).limit(15).all()
        return [
            {
                "id_cita": c.id_cita,
                "rut_paciente": c.rut_paciente,
                "nombre_paciente": c.nombre_paciente,
                "especialidad": c.especialidad,
                "nombre_medico": c.nombre_medico,
                "fecha_hora": c.fecha_hora,
                "estado": c.estado,
                "tipo_cita": c.tipo_cita,
                "prioridad": c.prioridad
            } for c in citas
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener vista previa de reportes: {str(e)}"
        )

@router.get("/admin/system-stats", tags=["Monitoreo"])
def get_system_stats(db: Session = Depends(get_db)):
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=None)
        
        # Memory metrics
        vm = psutil.virtual_memory()
        total_mb = round(vm.total / (1024 * 1024), 2)
        used_mb = round(vm.used / (1024 * 1024), 2)
        percent = vm.percent
        
        # Current process RSS memory
        import os
        try:
            process = psutil.Process(os.getpid())
            process_rss_mb = round(process.memory_info().rss / (1024 * 1024), 2)
        except Exception:
            process_rss_mb = 0.0
            
        # Database status and ping latency
        db_status = "connected"
        latency_ms = 0.0
        try:
            start_time = time.perf_counter()
            db.execute(text("SELECT 1"))
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        except Exception:
            db_status = "disconnected"
            
        # Operating System details
        os_platform = platform.system()
        os_release = platform.release()
        python_ver = platform.python_version()
        
        # Calculate uptime
        try:
            uptime = time.time() - psutil.boot_time()
        except Exception:
            try:
                uptime = time.time() - psutil.Process(os.getpid()).create_time()
            except Exception:
                uptime = 0.0
                
        return {
            "uptime_seconds": round(uptime, 2),
            "cpu_percent": cpu_percent,
            "memory": {
                "total_mb": total_mb,
                "used_mb": used_mb,
                "percent": percent,
                "process_rss_mb": process_rss_mb
            },
            "database": {
                "status": db_status,
                "latency_ms": latency_ms
            },
            "os": {
                "platform": os_platform,
                "release": os_release,
                "python_version": python_ver
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener métricas del sistema: {str(e)}"
        )
