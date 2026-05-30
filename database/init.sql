-- Crear tabla de Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    prevision VARCHAR(50) NOT NULL
);

-- Insertar un paciente de prueba
INSERT INTO pacientes (rut, nombres, apellidos, fecha_nacimiento, prevision)
VALUES (
    '12.345.678-9',
    'Juan Carlos',
    'Pérez Muñoz',
    '1985-10-15',
    'FONASA A'
)
ON CONFLICT (rut) DO NOTHING;
