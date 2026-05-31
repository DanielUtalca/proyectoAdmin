import { createContext, useContext, useState, useCallback } from 'react';

// Estructura inicial del usuario leyendo desde sessionStorage (para persistir recarga)
const getInitialUser = () => {
  const nombreMostrar = sessionStorage.getItem('nombreMostrar');
  const rol = sessionStorage.getItem('userRol');
  const rut = sessionStorage.getItem('userRut');
  if (nombreMostrar && rol) {
    return { nombreMostrar, rol, rut };
  }
  return null;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);

  // Llamado tras un login exitoso con la respuesta del backend
  const login = useCallback((data) => {
    const userData = {
      nombreMostrar: data.nombre_mostrar,
      rol: data.rol,
      rut: data.rut,
    };
    // Persitir en sessionStorage
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('nombreMostrar', data.nombre_mostrar);
    sessionStorage.setItem('userRol', data.rol);
    sessionStorage.setItem('userRut', data.rut);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto fácilmente
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
