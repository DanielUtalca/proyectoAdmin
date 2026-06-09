import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Cita, Logistica

router = APIRouter()

# ─────────────────────────────────────────────
# Schema de entrada
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    chatInput: str
    paciente_rut: str = "desconocido"
    paciente_nombre: str = "Paciente"
    rol_usuario: str = "Paciente"  # "Paciente", "Médico", "Funcionario"
    history: Optional[List[ChatMessage]] = None


# ─────────────────────────────────────────────
# Helper: construir contexto de citas
# ─────────────────────────────────────────────

def _formatear_citas(citas: list[Cita]) -> str:
    """Convierte las citas del paciente en texto legible para el LLM."""
    if not citas:
        return "El paciente no tiene citas registradas actualmente."

    lineas = []
    for c in citas:
        lineas.append(
            f"- {c.especialidad} con {c.nombre_medico} "
            f"el {c.fecha_hora} — Estado: {c.estado}"
            + (f" — Motivo: {c.motivo_consulta}" if c.motivo_consulta else "")
        )
    return "\n".join(lineas)


# ─────────────────────────────────────────────
# Endpoint principal
# ─────────────────────────────────────────────

@router.post("/chat")
async def chat_con_ia(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Recibe una consulta del chatbot, consulta las citas del paciente en la DB,
    construye el contexto y llama a la API de Gemini para generar la respuesta.
    """
    # 1. Verificar que la API Key esté configurada
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "TU_API_KEY_AQUI":
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Agrega GEMINI_API_KEY en las variables de entorno."
        )

    # 2. Consultar base de datos y construir el Prompt de Sistema según el rol
    role_normalized = req.rol_usuario.strip().lower()

    if role_normalized in ["médico", "medico"]:
        # Médico: ver su agenda de citas reservadas o atendidas
        citas_medico = db.query(Cita).filter(
            Cita.nombre_medico.ilike(f"%{req.paciente_nombre}%"),
            Cita.estado.in_(["RESERVADA", "ATENDIDA"])
        ).order_by(Cita.fecha_hora).all()

        if not citas_medico:
            contexto_medico = "No tienes citas agendadas o tu nombre no coincide en el registro de médicos."
        else:
            lineas = []
            for c in citas_medico:
                tipo = getattr(c, 'tipo_cita', 'Presencial')
                lineas.append(
                    f"- Cita ID {c.id_cita}: Paciente {c.nombre_paciente} (RUT: {c.rut_paciente}) "
                    f"a las {c.fecha_hora} [{tipo}]"
                    + (f" — Enlace: {c.enlace_telemedicina}" if (tipo == "Telemedicina" and c.enlace_telemedicina) else "")
                )
            contexto_medico = "\n".join(lineas)

        pacientes_restantes = len(citas_medico)

        system_prompt = f"""Eres el asistente virtual interno para los profesionales médicos del CESFAM Purranque. Sigue estas reglas:

## REGLA 1 — ROL Y TONO
Eres un asistente profesional, directo y eficiente. Ayudas al médico a resumir su agenda de atención diaria, indicando cuántos pacientes le quedan y el tipo de atención (Presencial o Telemedicina).

## REGLA 2 — LECTURA DE AGENDA
Usa ÚNICAMENTE la lista de citas proporcionada en el contexto para responder preguntas sobre su agenda del día. Si te pregunta cuántos pacientes le quedan o el detalle de sus citas, dale un resumen ejecutivo y estructurado.

## REGLA 3 — TELEMEDICINA
Si la cita es de "Telemedicina", recuérdale que se generará un enlace (Meet/Jitsi) al iniciar la sesión.

---
Médico en sesión: {req.paciente_nombre}
Pacientes restantes por atender hoy: {pacientes_restantes}

Agenda de Atenciones:
{contexto_medico}
---"""

    elif role_normalized in ["funcionario", "trabajador", "staff"]:
        # Funcionario/Staff: ver órdenes de despacho y visitas pendientes o en camino
        ordenes_pendientes = db.query(Logistica).filter(
            Logistica.estado.in_(["PENDIENTE", "EN_CAMINO"])
        ).order_by(Logistica.id).all()

        if not ordenes_pendientes:
            contexto_logistica = "No hay órdenes de despacho ni visitas domiciliarias pendientes o en camino."
        else:
            lineas = []
            for o in ordenes_pendientes:
                lineas.append(
                    f"- Orden ID {o.id} [{o.tipo}]: Paciente {o.nombre_paciente} (RUT: {o.rut_paciente}) "
                    f"en {o.direccion}. Detalle: {o.detalle or 'Sin detalle'} — Estado: {o.estado}"
                )
            contexto_logistica = "\n".join(lineas)

        system_prompt = f"""Eres el asistente virtual interno para el personal de logística del CESFAM Purranque. Sigue estas reglas:

## REGLA 1 — ROL Y TONO
Eres un asistente operativo, claro y directo. Ayudas al funcionario a conocer y gestionar los despachos de medicamentos y las visitas domiciliarias que están pendientes o en camino.

## REGLA 2 — LECTURA DE LOGÍSTICA
Usa ÚNICAMENTE la lista de órdenes proporcionada en el contexto. Proporciona resúmenes ordenados de qué entregas o visitas están pendientes, a qué direcciones ir, y el estado actual de cada tarea si el funcionario lo solicita.

---
Funcionario en sesión: {req.paciente_nombre}

Lista de Órdenes Pendientes y En Camino (Logística):
{contexto_logistica}
---"""

    else:
        # Paciente: ver sus citas agendadas y el estado de sus despachos/visitas
        citas = db.query(Cita).filter(
            Cita.rut_paciente == req.paciente_rut,
            Cita.estado.in_(["RESERVADA", "ATENDIDA"])
        ).order_by(Cita.fecha_hora).all()

        contexto_citas = _formatear_citas(citas)

        logistica_paciente = db.query(Logistica).filter(
            Logistica.rut_paciente == req.paciente_rut
        ).order_by(Logistica.id).all()

        if not logistica_paciente:
            contexto_logistica = "No tienes solicitudes de despacho ni visitas domiciliarias registradas actualmente."
        else:
            lineas = []
            for l in logistica_paciente:
                lineas.append(
                    f"- {l.tipo} a {l.direccion} ({l.detalle or 'Sin detalle'}) — Estado: {l.estado}"
                )
            contexto_logistica = "\n".join(lineas)

        system_prompt = f"""Eres el asistente virtual del CESFAM Purranque. Sigue ESTRICTAMENTE estas reglas:

## REGLA 1 — IDENTIDAD Y CONCISIÓN
Eres amable, empático y EXTREMADAMENTE conciso. Cada respuesta debe tener un MÁXIMO de 3 oraciones.
No repitas saludos si ya iniciaste la conversación. No menciones herramientas internas ni procesos del sistema.

## REGLA 2 — LECTURA DE CITAS Y DESPACHOS
Tienes acceso al historial de citas y al estado de los despachos/visitas del paciente (ver contexto más abajo).
Si el paciente pregunta por sus citas o el estado de sus despachos, responde usando ÚNICAMENTE la información del contexto. Si no hay registros, dilo claramente.

## REGLA 3 — GESTIÓN DE AGENDA (PROHIBICIÓN ABSOLUTA)
TÚ NO AGENDAS, REAGENDAS NI CANCELAS CITAS DIRECTAMENTE.
Si el paciente solicita cualquiera de estas acciones, responde con EXACTAMENTE este texto:
"Para gestionar tus horas, por favor utiliza la pestaña 'Agendar nueva cita' o el botón de 'Cancelar Hora' en tu panel."

## REGLA 4 — TRIAGE Y URGENCIAS (MÁXIMA PRIORIDAD)
Analiza si el paciente describe síntomas. Aplica esta lógica:
- SÍNTOMAS GRAVES (dolor de pecho, dificultad para respirar, sangrado activo, pérdida de conciencia, convulsiones, fiebre sobre 39°C, dolor abdominal severo, parálisis facial, etc.): Responde que es una situación de PRIORIDAD ALTA e indícale que debe acudir INMEDIATAMENTE al Servicio de Atención de Urgencias (SAR) más cercano, sin tomar una cita regular. No lo hagas esperar.
- SÍNTOMAS LEVES o controles preventivos: Guíalo a agendar una hora normal en la interfaz del CESFAM.

---
Información del paciente en sesión:
- Nombre: {req.paciente_nombre}
- RUT: {req.paciente_rut}

Historial de citas registradas:
{contexto_citas}

Estado de despachos y visitas (Logística):
{contexto_logistica}
---"""

    # 4. Llamar a la API de Gemini
    try:
        from google import genai
        from google.genai import types
        import time

        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)

        # Construir historial estructurado para la API de Gemini
        history = []
        if req.history:
            for msg in req.history:
                # En la API de Gemini, el rol del modelo es "model"
                role = "model" if msg.role == "assistant" else "user"
                
                # Evitar que el historial empiece con 'model' (bienvenida)
                if not history and role == "model":
                    continue
                
                # Evitar turnos consecutivos del mismo rol fusionando sus textos
                if history and history[-1].role == role:
                    history[-1].parts[0].text += f"\n{msg.text}"
                else:
                    history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg.text)]
                        )
                    )

        # Lógica de reintento automático con backoff exponencial
        max_retries = 3
        backoff_factor = 1.0
        respuesta_texto = "Lo siento, no pude procesar tu consulta en este momento."

        for attempt in range(max_retries):
            try:
                # Crear sesión de chat con el historial y las instrucciones de sistema
                chat = client.chats.create(
                    model=model_name,
                    history=history,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.3,
                        max_output_tokens=512,
                    )
                )
                response = chat.send_message(req.chatInput)
                respuesta_texto = response.text.strip()
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(backoff_factor)
                backoff_factor *= 2

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al comunicarse con el servicio de IA: {str(e)}"
        )

    # 5. Retornar en el mismo formato que esperaba el frontend con n8n
    return {"output": respuesta_texto}
