import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatbotFlotante.css';

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/chat';

// Mensaje inicial del asistente al abrir el chat
const MENSAJE_BIENVENIDA = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Soy el asistente virtual del CESFAM Purranque 🏥\n¿En qué puedo ayudarte hoy? Puedo responder preguntas sobre tus citas, medicamentos o trámites.',
  timestamp: new Date(),
};

const ChatbotFlotante = () => {
  const { user } = useAuth();
  const rut = user?.rut || sessionStorage.getItem('userRut') || 'desconocido';

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([MENSAJE_BIENVENIDA]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (abierto) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, abierto]);

  // Foco automático al input cuando abre
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [abierto]);

  const toggleChat = () => {
    setAbierto((prev) => !prev);
    setNotificacion(false);
  };

  const enviarMensaje = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    // Agregar mensaje del usuario al historial
    const msgUsuario = {
      id: Date.now(),
      role: 'user',
      text: texto,
      timestamp: new Date(),
    };
    setMensajes((prev) => [...prev, msgUsuario]);
    setInput('');
    setCargando(true);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: texto,
          paciente_rut: rut,
          paciente_nombre: user
            ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim()
            : 'desconocido',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      // Manejar respuesta: puede ser un objeto, o un array de objetos
      const responseData = Array.isArray(data) ? data[0] : data;

      // Buscar el contenido en campos comunes de n8n
      const respuestaIA = responseData?.output
        || responseData?.text
        || responseData?.message
        || responseData?.response
        || 'No pude procesar tu consulta. Intenta nuevamente.';

      const msgAsistente = {
        id: Date.now() + 1,
        role: 'assistant',
        text: respuestaIA,
        timestamp: new Date(),
      };
      setMensajes((prev) => [...prev, msgAsistente]);
    } catch (err) {
      const msgError = {
        id: Date.now() + 1,
        role: 'assistant',
        text: '⚠️ No pude conectarme con el asistente en este momento. Verifica que el servicio n8n esté activo.',
        timestamp: new Date(),
        esError: true,
      };
      setMensajes((prev) => [...prev, msgError]);
      console.error('[ChatbotFlotante] Error al contactar n8n:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const formatearHora = (date) =>
    date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Panel del Chat ── */}
      <div className={`chatbot-panel ${abierto ? 'chatbot-panel--abierto' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar-header">
              <Bot size={18} />
            </div>
            <div>
              <span className="chatbot-header-nombre">Asistente CESFAM</span>
              <span className="chatbot-header-estado">
                <span className="chatbot-estado-dot" />
                En línea
              </span>
            </div>
          </div>
          <button className="chatbot-close-btn" onClick={toggleChat} title="Cerrar chat">
            <X size={18} />
          </button>
        </div>

        {/* Área de mensajes */}
        <div className="chatbot-mensajes">
          {mensajes.map((msg) => (
            <div
              key={msg.id}
              className={`chatbot-msg chatbot-msg--${msg.role} ${msg.esError ? 'chatbot-msg--error' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="chatbot-msg-avatar">
                  <Bot size={14} />
                </div>
              )}
              <div className="chatbot-msg-burbuja">
                <p>{msg.text}</p>
                <span className="chatbot-msg-hora">{formatearHora(msg.timestamp)}</span>
              </div>
              {msg.role === 'user' && (
                <div className="chatbot-msg-avatar chatbot-msg-avatar--user">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {/* Indicador "Escribiendo..." */}
          {cargando && (
            <div className="chatbot-msg chatbot-msg--assistant">
              <div className="chatbot-msg-avatar">
                <Bot size={14} />
              </div>
              <div className="chatbot-msg-burbuja chatbot-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-area">
          <textarea
            ref={inputRef}
            className="chatbot-input"
            placeholder="Escribe tu consulta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={cargando}
            rows={1}
          />
          <button
            className="chatbot-send-btn"
            onClick={enviarMensaje}
            disabled={cargando || !input.trim()}
            title="Enviar mensaje"
          >
            {cargando ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* ── Botón flotante ── */}
      <button
        id="chatbot-fab"
        className={`chatbot-fab ${abierto ? 'chatbot-fab--activo' : ''}`}
        onClick={toggleChat}
        title="Abrir asistente virtual"
        aria-label="Asistente virtual CESFAM"
      >
        {abierto ? <X size={24} /> : <MessageCircle size={24} />}
        {notificacion && !abierto && <span className="chatbot-fab-badge" />}
      </button>
    </>
  );
};

export default ChatbotFlotante;
