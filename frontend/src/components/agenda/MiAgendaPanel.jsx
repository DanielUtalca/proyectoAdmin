import React, { useState } from 'react';
import ListaMisCitas from './ListaMisCitas';
import SelectorCitas from './SelectorCitas';
import './Agenda.css';

const MiAgendaPanel = () => {
  const [activeTab, setActiveTab] = useState('mis-citas');

  return (
    <div className="agenda-container">
      <div className="agenda-tabs">
        <button 
          className={`tab-btn ${activeTab === 'mis-citas' ? 'active' : ''}`}
          onClick={() => setActiveTab('mis-citas')}
        >
          Mis próximas citas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'agendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendar')}
        >
          Agendar nueva cita
        </button>
      </div>

      <div className="agenda-content">
        {activeTab === 'mis-citas' ? (
          <ListaMisCitas />
        ) : (
          <SelectorCitas onCitaAgendada={() => setActiveTab('mis-citas')} />
        )}
      </div>
    </div>
  );
};

export default MiAgendaPanel;
