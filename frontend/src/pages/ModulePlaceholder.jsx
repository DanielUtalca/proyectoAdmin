import { 
  CalendarDays, 
  Video, 
  MapPin, 
  Clock, 
  Map, 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileText,
  Hammer
} from 'lucide-react';

const getIcon = (iconName, size = 64) => {
  switch (iconName) {
    case 'CalendarDays': return <CalendarDays size={size} color="var(--primary)" />;
    case 'Video': return <Video size={size} color="var(--primary)" />;
    case 'MapPin': return <MapPin size={size} color="var(--primary)" />;
    case 'Clock': return <Clock size={size} color="var(--primary)" />;
    case 'Map': return <Map size={size} color="var(--primary)" />;
    case 'LayoutDashboard': return <LayoutDashboard size={size} color="var(--primary)" />;
    case 'FileSpreadsheet': return <FileSpreadsheet size={size} color="var(--primary)" />;
    case 'FileText': return <FileText size={size} color="var(--primary)" />;
    default: return <Hammer size={size} color="var(--primary)" />;
  }
};

/**
 * Muestra una vista base para los módulos en desarrollo con alta estética.
 */
const ModulePlaceholder = ({ title, iconName, description }) => {
  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        {getIcon(iconName, 56)}
      </div>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.text}>{description || 'Módulo en desarrollo (Paso 3)...'}</p>
      
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}></div>
      </div>
      <span style={styles.statusText}>Preparado para integración de base de datos</span>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    height: '100%',
    flex: 1,
    backgroundColor: 'var(--surface)',
    borderRadius: '16px',
    border: '2px dashed var(--border)',
    padding: '3rem 2rem',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
    animation: 'fadeIn 0.3s ease-out'
  },
  iconWrapper: {
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
    padding: '1.25rem',
    borderRadius: '50%',
    marginBottom: '1.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '0.75rem',
    letterSpacing: '-0.5px'
  },
  text: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
    maxWidth: '450px',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  progressContainer: {
    width: '100%',
    maxWidth: '200px',
    height: '6px',
    backgroundColor: 'var(--border)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '0.75rem'
  },
  progressBar: {
    width: '35%',
    height: '100%',
    backgroundColor: 'var(--primary)',
    borderRadius: '3px',
    animation: 'pulseBar 2s infinite ease-in-out'
  },
  statusText: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};

export default ModulePlaceholder;
