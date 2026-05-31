import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// ──────────────────────────────────────────────
// Validaciones visuales del formulario de registro
// ──────────────────────────────────────────────
const validateRegistro = (fields) => {
  const errs = {};
  if (!fields.rut.trim()) errs.rut = 'El RUT es obligatorio.';
  if (fields.password.length < 6) errs.password = 'Mínimo 6 caracteres.';
  if (fields.nombre.trim().length < 2) errs.nombre = 'Ingrese un nombre válido.';
  if (fields.apellido.trim().length < 2) errs.apellido = 'Ingrese un apellido válido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.correo)) errs.correo = 'Correo electrónico inválido.';
  if (!/^\+?\d{8,15}$/.test(fields.telefono.replace(/[\s-]/g, '')))
    errs.telefono = 'Teléfono inválido (mínimo 8 dígitos).';
  if (!fields.direccion.trim()) errs.direccion = 'La dirección es obligatoria.';
  return errs;
};

// ──────────────────────────────────────────────
// Sub-componente: campo de formulario con error
// ──────────────────────────────────────────────
const Field = ({ id, label, type = 'text', placeholder, value, onChange, error, disabled }) => (
  <div className={`form-group ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoComplete="off"
    />
    {error && <span className="field-error">{error}</span>}
  </div>
);

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  // Estado formulario login
  const [loginRut, setLoginRut] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Estado formulario registro
  const [reg, setReg] = useState({
    rut: '', password: '', nombre: '', apellido: '',
    correo: '', telefono: '', direccion: '',
  });
  const [regErrors, setRegErrors] = useState({});
  const [registroOk, setRegistroOk] = useState(false);

  // UI global
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setRegField = (field) => (e) => setReg((prev) => ({ ...prev, [field]: e.target.value }));

  // ── LOGIN ──────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: loginRut, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Credenciales incorrectas. Verifique el RUT y la contraseña.');
        return;
      }

      // Guardar en el contexto global
      login(data);
      navigate('/dashboard');
    } catch {
      setError('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTRO ────────────────────────────────
  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setRegistroOk(false);

    // Validación visual previa
    const errs = validateRegistro(reg);
    if (Object.keys(errs).length > 0) {
      setRegErrors(errs);
      return;
    }
    setRegErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Error al registrar el usuario.');
        return;
      }

      setRegistroOk(true);
      setReg({ rut: '', password: '', nombre: '', apellido: '', correo: '', telefono: '', direccion: '' });

      // Cambiar a login tras 1.5 s
      setTimeout(() => {
        setRegistroOk(false);
        setIsLogin(true);
      }, 1500);
    } catch {
      setError('No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toLogin) => {
    setIsLogin(toLogin);
    setError('');
    setRegErrors({});
    setRegistroOk(false);
  };

  return (
    <div className="login-container">
      {/* Columna Izquierda: Branding */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="logo-icon-container">
            <Activity className="logo-icon" size={64} />
          </div>
          <h1>CESFAM Purranque</h1>
          <p>Sistema de Gestión Clínica Integral</p>
          <div className="brand-footer">
            <p>Ministerio de Salud - Chile</p>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Formularios */}
      <div className="login-form-container">
        <div className="form-box">
          <h2>{isLogin ? 'Bienvenido' : 'Crear Cuenta'}</h2>
          <p className="subtitle">
            {isLogin
              ? 'Ingresa tus credenciales para continuar'
              : 'Completa tus datos para registrarte como paciente'}
          </p>

          {/* Toggle Tab */}
          <div className="form-tabs">
            <button className={isLogin ? 'active' : ''} onClick={() => switchTab(true)} type="button">
              Ingresar
            </button>
            <button className={!isLogin ? 'active' : ''} onClick={() => switchTab(false)} type="button">
              Registrarse
            </button>
          </div>

          {/* Banner de error global */}
          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Banner de éxito en registro */}
          {registroOk && (
            <div className="success-message" role="status">
              <CheckCircle2 size={16} />
              <span>¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...</span>
            </div>
          )}

          {/* ── FORMULARIO LOGIN ────────────── */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="auth-form">
              <Field
                id="login-rut" label="RUT" placeholder="12.345.678-9"
                value={loginRut} onChange={(e) => setLoginRut(e.target.value)} disabled={loading}
              />
              <Field
                id="login-password" label="Contraseña" type="password" placeholder="••••••••"
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={loading}
              />
              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Recordarme
                </label>
                <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><Loader2 size={16} className="spin" /> Verificando...</> : 'ENTRAR'}
              </button>
            </form>
          ) : (
            /* ── FORMULARIO REGISTRO ───────── */
            <form onSubmit={handleRegistro} className="auth-form registro-form">
              <div className="form-row">
                <Field
                  id="reg-nombre" label="Nombre" placeholder="Ej. Juan"
                  value={reg.nombre} onChange={setRegField('nombre')}
                  error={regErrors.nombre} disabled={loading}
                />
                <Field
                  id="reg-apellido" label="Apellido" placeholder="Ej. Pérez"
                  value={reg.apellido} onChange={setRegField('apellido')}
                  error={regErrors.apellido} disabled={loading}
                />
              </div>
              <Field
                id="reg-rut" label="RUT" placeholder="12.345.678-9"
                value={reg.rut} onChange={setRegField('rut')}
                error={regErrors.rut} disabled={loading}
              />
              <Field
                id="reg-correo" label="Correo electrónico" type="email" placeholder="correo@ejemplo.com"
                value={reg.correo} onChange={setRegField('correo')}
                error={regErrors.correo} disabled={loading}
              />
              <div className="form-row">
                <Field
                  id="reg-telefono" label="Teléfono" placeholder="+56912345678"
                  value={reg.telefono} onChange={setRegField('telefono')}
                  error={regErrors.telefono} disabled={loading}
                />
                <Field
                  id="reg-password" label="Contraseña" type="password" placeholder="Mín. 6 caracteres"
                  value={reg.password} onChange={setRegField('password')}
                  error={regErrors.password} disabled={loading}
                />
              </div>
              <Field
                id="reg-direccion" label="Dirección" placeholder="Av. Principal 123, Purranque"
                value={reg.direccion} onChange={setRegField('direccion')}
                error={regErrors.direccion} disabled={loading}
              />
              <p className="registro-nota">
                Al registrarte, tu cuenta será creada con el rol de <strong>Paciente</strong>.
              </p>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <><Loader2 size={16} className="spin" /> Registrando...</> : 'CREAR CUENTA'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
