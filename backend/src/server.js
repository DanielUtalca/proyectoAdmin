import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Log en consola para registrar el inicio de la API
console.log(`[Server] Iniciando servidor de backend de CESFAM...`);

// Instanciar pool de conexión a PostgreSQL (para futura lógica de negocio)
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Ruta base GET / que responde un JSON y registra la llamada para validar balanceo de carga
app.get('/', (req, res) => {
  const logMessage = `[GET] Petición recibida en / - Host: ${req.hostname} - IP: ${req.ip} - Timestamp: ${new Date().toISOString()}`;
  console.log(logMessage);
  
  res.json({
    status: "API Node funcionando",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Ruta para comprobación de estado de salud (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Escuchar en 0.0.0.0 para recibir conexiones dentro del contenedor Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Servidor backend ejecutándose en http://localhost:${PORT}`);
});
