-- Crear tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    correo VARCHAR(150),
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    especialidad VARCHAR(100)
);

-- Crear tabla de Citas
CREATE TABLE IF NOT EXISTS citas (
    id_cita SERIAL PRIMARY KEY,
    rut_paciente VARCHAR(50),
    nombre_paciente VARCHAR(150),
    especialidad VARCHAR(100) NOT NULL,
    nombre_medico VARCHAR(150) NOT NULL,
    fecha_hora VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',
    prioridad VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    motivo_consulta TEXT,
    tipo_cita VARCHAR(50) NOT NULL DEFAULT 'Presencial',
    enlace_telemedicina VARCHAR(255)
);

-- Crear tabla de Logística
CREATE TABLE IF NOT EXISTS logistica (
    id SERIAL PRIMARY KEY,
    rut_paciente VARCHAR(50) NOT NULL,
    nombre_paciente VARCHAR(150),
    tipo VARCHAR(50) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    detalle VARCHAR(255),
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
);
