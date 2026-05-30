import React from 'react';
import { CalendarDays } from 'lucide-react';

const Agenda = () => {
  return (
    <div className="placeholder-page" style={styles.container}>
      <CalendarDays size={64} color="var(--primary)" style={styles.icon} />
      <h1 style={styles.title}>Agenda 24/7</h1>
      <p style={styles.text}>Módulo de Agenda en desarrollo (Paso 3)...</p>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flex: 1,
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    border: '1px dashed var(--border)',
    padding: '2rem',
    textAlign: 'center',
    opacity: 0.7
  },
  icon: {
    marginBottom: '1rem',
    opacity: 0.5
  },
  title: {
    fontSize: '1.5rem',
    color: 'var(--text-main)',
    marginBottom: '0.5rem'
  },
  text: {
    color: 'var(--text-muted)'
  }
};

export default Agenda;
