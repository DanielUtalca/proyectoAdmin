import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simular el proceso de inicio de sesión exitoso guardando en memoria
    sessionStorage.setItem('isAuthenticated', 'true');
    navigate('/dashboard');
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
              : 'Completa los datos para registrarte en el sistema'}
          </p>

          {/* Toggle Tab */}
          <div className="form-tabs">
            <button 
              className={isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(true)}
              type="button"
            >
              Ingresar
            </button>
            <button 
              className={!isLogin ? 'active' : ''} 
              onClick={() => setIsLogin(false)}
              type="button"
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" placeholder="Ej. Juan Pérez" required={!isLogin} />
              </div>
            )}
            <div className="form-group">
              <label>RUT</label>
              <input type="text" placeholder="12.345.678-9" required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" required />
            </div>
            
            {isLogin && (
              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Recordarme
                </label>
                <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
              </div>
            )}

            <button type="submit" className="submit-btn">
              {isLogin ? 'ENTRAR' : 'REGISTRARSE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
