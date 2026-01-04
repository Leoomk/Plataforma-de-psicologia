import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  FileText,
  BarChart3,
  Share2,
  LayoutDashboard,
  Bell,
  Search,
  Plus,
  Mic,
  Settings,
  LogOut,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Play,
  Square,
  X,
  Upload,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Download
} from 'lucide-react';
import './App.css';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <div
    className={`sidebar-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <Icon size={20} />
    <span>{label}</span>
  </div>
);

const loadInitialState = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveState = (key, state) => {
  localStorage.setItem(key, JSON.stringify(state));
};

const ThemeSelector = ({ currentTheme, onSelect }) => {
  const themes = [
    { id: 'magenta', name: 'Magenta', color: '#e879f9' },
    { id: 'rose', name: 'Rosa', color: '#fb7185' },
    { id: 'lavender', name: 'Lavanda', color: '#c084fc' },
    { id: 'mint', name: 'Menta', color: '#6ee7b7' },
    { id: 'peach', name: 'Pêssego', color: '#fdba74' },
  ];

  return (
    <div className="theme-grid">
      {themes.map(theme => (
        <div
          key={theme.id}
          className={`theme-option ${currentTheme === theme.id ? 'selected' : ''}`}
          onClick={() => onSelect(theme.id)}
        >
          <div className="theme-color" style={{ background: theme.color }}></div>
          <span>{theme.name}</span>
          {currentTheme === theme.id && <Check size={16} className="check-icon" />}
        </div>
      ))}
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dashboardFilter, setDashboardFilter] = useState('mes'); // hoje, semana, mes, mes_passado, ano
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState(null);
  const [patientDetailTab, setPatientDetailTab] = useState('overview'); // overview, sessions, anamnesis, summary

  // Estados iniciais carregados do localStorage
  const [userProfile, setUserProfile] = useState(() => loadInitialState('userProfile', {
    name: 'Dra. Ana',
    initials: 'DA',
    avatar: null,
    theme: 'magenta'
  }));

  const [lastBackupDate, setLastBackupDate] = useState(() => loadInitialState('lastBackupDate', null));

  const [patients, setPatients] = useState(() => loadInitialState('patients', [
    {
      id: 1,
      name: 'Ana Clara Silva',
      email: 'ana@email.com',
      phone: '(11) 98877-6655',
      cpf: '123.456.789-00',
      address: 'Rua das Flores, 123 - SP',
      sessionValue: 200,
      frequency: 'Semanal',
      requiresNF: true,
      lastSession: '18/12/2025'
    },
    {
      id: 2,
      name: 'Carlos Eduardo Santos',
      email: 'carlos@email.com',
      phone: '(11) 97766-5544',
      cpf: '234.567.890-11',
      address: 'Av. Paulista, 1000 - SP',
      sessionValue: 180,
      frequency: 'Quinzenal',
      requiresNF: false,
      lastSession: '15/12/2025'
    },
    {
      id: 3,
      name: 'Juliana Mendes',
      email: 'juliana@email.com',
      phone: '(11) 96655-4433',
      cpf: '345.678.901-22',
      address: 'Rua Augusta, 500 - SP',
      sessionValue: 250,
      frequency: 'Mensal',
      requiresNF: true,
      lastSession: '12/12/2025'
    },
  ]));

  const [events, setEvents] = useState(() => loadInitialState('events', [
    { id: 1, date: '2025-12-19', time: '14:00', patient: 'Ana Clara Silva', type: 'Psicoterapia', status: 'confirmed' },
    { id: 2, date: '2025-12-19', time: '15:30', patient: 'Carlos Santos', type: 'Avaliação', status: 'confirmed' },
    { id: 3, date: '2025-12-20', time: '10:00', patient: 'Juliana Mendes', type: 'Psicoterapia', status: 'pending' },
    { id: 4, date: '2025-12-21', time: '16:00', patient: 'Marcos Oliveira', type: 'Retorno', status: 'confirmed' },
  ]));

  const [contracts, setContracts] = useState(() => loadInitialState('contracts', [
    { id: 1, patientId: 1, patientName: 'Ana Clara Silva', value: 200, paymentDay: 5, frequency: 'Mensal', status: 'Ativo', requiresNF: true },
    { id: 2, patientId: 2, patientName: 'Carlos Eduardo Santos', value: 180, paymentDay: 10, frequency: 'Quinzenal', status: 'Ativo', requiresNF: false },
    { id: 3, patientId: 3, patientName: 'Juliana Mendes', value: 250, paymentDay: 15, frequency: 'Mensal', status: 'Ativo', requiresNF: true },
    { id: 4, patientId: 4, patientName: 'Marcos Oliveira', value: 150, paymentDay: 20, frequency: 'Mensal', status: 'Suspenso', requiresNF: false },
  ]));

  const [payments, setPayments] = useState(() => loadInitialState('payments', [
    { id: 1, patientName: 'Ana Clara Silva', date: '2025-12-05', value: 200, status: 'Pago' },
    { id: 2, patientName: 'Carlos Eduardo Santos', date: '2025-12-10', value: 180, status: 'Pendente' },
    { id: 3, patientName: 'Juliana Mendes', date: '2025-12-15', value: 250, status: 'Atrasado' },
  ]));

  const [editingContract, setEditingContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    sessionValue: 200,
    frequency: 'Semanal',
    requiresNF: false
  });
  const [selectedFinancePatient, setSelectedFinancePatient] = useState(null);
  const [showFinanceDetail, setShowFinanceDetail] = useState(false);
  const [newSession, setNewSession] = useState({
    patient: '',
    date: '',
    time: '',
    type: 'Psicoterapia',
    status: 'pending'
  });

  // Efeito para persistência automática
  useEffect(() => {
    saveState('userProfile', userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveState('patients', patients);
  }, [patients]);

  useEffect(() => {
    saveState('events', events);
  }, [events]);

  useEffect(() => {
    saveState('contracts', contracts);
  }, [contracts]);

  useEffect(() => {
    saveState('payments', payments);
  }, [payments]);

  // Aplicar tema inicial
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', userProfile.theme);
  }, []);
  const handleUpdateContract = (updatedContract) => {
    setContracts(contracts.map(c => c.id === updatedContract.id ? updatedContract : c));
    setShowContractModal(false);
    setEditingContract(null);
  };

  useEffect(() => {
    saveState('lastBackupDate', lastBackupDate);
  }, [lastBackupDate]);


  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscriptionStatus('recording');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setTranscriptionStatus('processing');
    setTimeout(() => {
      setTranscriptionStatus('done');
    }, 2500);
  };

  const handleThemeChange = (theme) => {
    setUserProfile({ ...userProfile, theme });
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile({ ...userProfile, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportData = () => {
    const now = new Date();
    const backup = {
      userProfile,
      patients,
      events,
      contracts,
      payments,
      version: '1.0',
      exportedAt: now.toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_psicologia_${now.toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackupDate(now.toISOString());
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.patients && imported.events) {
            setUserProfile(imported.userProfile || userProfile);
            setPatients(imported.patients);
            setEvents(imported.events);
            setContracts(imported.contracts || contracts);
            setPayments(imported.payments || payments);

            if (imported.exportedAt) {
              setLastBackupDate(imported.exportedAt);
            } else {
              setLastBackupDate(new Date().toISOString());
            }

            alert('Dados do Baú de Tesouro recuperados com sucesso!');
          } else {
            alert('Arquivo de backup inválido.');
          }
        } catch (err) {
          alert('Erro ao ler arquivo.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSendNFEmail = (contract) => {
    const patient = patients.find(p => p.name === contract.patientName);
    const subject = encodeURIComponent(`Emissão de NF - ${contract.patientName} - Mês ${new Date().getMonth() + 1}`);
    const body = encodeURIComponent(
      `Olá,\n\nFavor emitir a Nota Fiscal para o paciente abaixo:\n\n` +
      `Nome: ${contract.patientName}\n` +
      `Valor: R$ ${calculateMonthlyValue(contract)}\n` +
      `Referência: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\n\n` +
      `Obrigada!`
    );
    window.location.href = `mailto:contabilidade@exemplo.com?subject=${subject}&body=${body}`;
  };

  const calculateMonthlyValue = (contract) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const sessionsInMonth = events.filter(e => {
      const eDate = new Date(e.date + 'T00:00:00');
      return eDate.getMonth() === currentMonth &&
        eDate.getFullYear() === currentYear &&
        e.patient === contract.patientName &&
        (e.status === 'confirmed' || e.status === 'unexcused_absence');
    }).length;

    // Se tiver valor de sessão, calcula por sessão realizada
    if (contract.value > 0) {
      return contract.value * sessionsInMonth;
    }

    return 0;
  };

  const getSessionsCount = (patientName) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return events.filter(e => {
      const eDate = new Date(e.date + 'T00:00:00');
      return eDate.getMonth() === currentMonth &&
        eDate.getFullYear() === currentYear &&
        e.patient === patientName &&
        (e.status === 'confirmed' || e.status === 'unexcused_absence');
    }).length;
  };

  const handleAddPatient = () => {
    if (newPatient.name) {
      const id = patients.length + 1;
      const patientToAdd = { ...newPatient, id, lastSession: '-' };
      setPatients([...patients, patientToAdd]);

      // Criar contrato padrão para o novo paciente
      setContracts([...contracts, {
        id: contracts.length + 1,
        patientId: id,
        patientName: newPatient.name,
        value: newPatient.sessionValue,
        paymentDay: 5,
        frequency: newPatient.frequency,
        status: 'Ativo',
        requiresNF: newPatient.requiresNF
      }]);

      setNewPatient({
        name: '', email: '', phone: '', cpf: '',
        address: '', sessionValue: 200, frequency: 'Semanal', requiresNF: false
      });
      setShowAddPatientModal(false);
    }
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setNewPatient({ ...patient });
    setShowAddPatientModal(true);
  };

  const handleUpdatePatient = () => {
    if (newPatient.name && editingPatient) {
      setPatients(patients.map(p => p.id === editingPatient.id ? { ...newPatient } : p));

      // Atualizar contrato se existir
      setContracts(contracts.map(c => c.patientId === editingPatient.id ? {
        ...c,
        patientName: newPatient.name,
        value: newPatient.sessionValue,
        frequency: newPatient.frequency,
        requiresNF: newPatient.requiresNF
      } : c));

      setEditingPatient(null);
      setNewPatient({
        name: '', email: '', phone: '', cpf: '',
        address: '', sessionValue: 200, frequency: 'Semanal', requiresNF: false
      });
      setShowAddPatientModal(false);
    }
  };

  const handleAddSession = () => {
    if (newSession.patient && newSession.date && newSession.time) {
      const newEvent = {
        id: events.length + 1,
        ...newSession
      };
      setEvents([...events, newEvent]);
      setNewSession({ patient: '', date: '', time: '', type: 'Psicoterapia', status: 'pending' });
      setShowNewSessionModal(false);
    }
  };

  const updateEventStatus = (id, newStatus) => {
    setEvents(events.map(e => e.id === id ? { ...e, status: newStatus } : e));
  };

  const handleReschedule = (event) => {
    // Marcar atual como reagendado
    updateEventStatus(event.id, 'rescheduled');
    // Preparar nova sessão com mesmos dados
    setNewSession({
      patient: event.patient,
      date: '', // Limpa para obrigar a escolher nova data
      time: event.time,
      type: event.type,
      status: 'pending'
    });
    setShowNewSessionModal(true);
  };

  // Funções de calendário
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const getEventsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-effect">
        <div className="sidebar-logo">
          <div className="logo-icon">💜</div>
          <h2>Plataforma de Psicologia</h2>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem
            icon={LayoutDashboard}
            label="Minha Clínica"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem
            icon={Users}
            label="Pacientes"
            active={activeTab === 'patients'}
            onClick={() => setActiveTab('patients')}
          />
          <SidebarItem
            icon={Calendar}
            label="Agenda"
            active={activeTab === 'calendar'}
            onClick={() => setActiveTab('calendar')}
          />
          <SidebarItem
            icon={FileText}
            label="Prontuários"
            active={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
          />
          <SidebarItem
            icon={BarChart3}
            label="Financeiro"
            active={activeTab === 'finance'}
            onClick={() => setActiveTab('finance')}
          />
          <SidebarItem
            icon={Share2}
            label="Marketing"
            active={activeTab === 'marketing'}
            onClick={() => setActiveTab('marketing')}
          />
        </nav>

        <div className="sidebar-footer">
          <SidebarItem icon={Settings} label="Configurações" />
          <SidebarItem icon={LogOut} label="Sair" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header glass-effect">
          <div className="header-search">
            <Search size={18} />
            <input type="text" placeholder="Buscar pacientes, sessões..." />
          </div>

          <div className="header-actions">
            <button className="btn-icon">
              <Bell size={20} />
              <span className="badge"></span>
            </button>
            <div className="user-profile" onClick={() => setShowSettings(true)}>
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Avatar" className="avatar-img" />
              ) : (
                <div className="avatar">{userProfile.initials}</div>
              )}
              <span>{userProfile.name}</span>
            </div>
          </div>
        </header>

        <section className="content-area">
          {activeTab === 'dashboard' && (
            <div className="dashboard-view animate-fade-in">
              <div className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <h1>Minha Clínica</h1>
                  <p>Acompanhe o desempenho do seu consultório.</p>
                </div>
                <div className="filter-group">
                  <select
                    className="form-input"
                    value={dashboardFilter}
                    onChange={(e) => setDashboardFilter(e.target.value)}
                    style={{ paddingTop: '8px', paddingBottom: '8px' }}
                  >
                    <option value="hoje">Hoje</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Mês Atual</option>
                    <option value="mes_passado">Mês Passado</option>
                    <option value="ano">Este Ano</option>
                  </select>
                </div>
              </div>

              {(() => {
                const getFilteredStats = () => {
                  const now = new Date();
                  let start = new Date();
                  let end = new Date();

                  if (dashboardFilter === 'hoje') {
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                  } else if (dashboardFilter === 'semana') {
                    const day = now.getDay();
                    start.setDate(now.getDate() - day);
                    start.setHours(0, 0, 0, 0);
                    end.setDate(now.getDate() + (6 - day));
                    end.setHours(23, 59, 59, 999);
                  } else if (dashboardFilter === 'mes') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  } else if (dashboardFilter === 'mes_passado') {
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    end = new Date(now.getFullYear(), now.getMonth(), 0);
                  } else if (dashboardFilter === 'ano') {
                    start = new Date(now.getFullYear(), 0, 1);
                    end = new Date(now.getFullYear(), 11, 31);
                  }

                  const periodEvents = events.filter(e => {
                    const d = new Date(e.date + 'T00:00:00');
                    return d >= start && d <= end;
                  });

                  const confirmed = periodEvents.filter(e => e.status === 'confirmed').length;
                  const total = periodEvents.length;
                  const attendanceRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

                  const activePatients = new Set(periodEvents.map(e => e.patient)).size;

                  // Faturamento estimado (considerando valor da sessão do contrato)
                  const estimatedValue = periodEvents.reduce((acc, e) => {
                    const contract = contracts.find(c => c.patientName === e.patient);
                    if (e.status !== 'cancelled' && e.status !== 'excused_absence') {
                      return acc + (contract?.value || 0);
                    }
                    return acc;
                  }, 0);

                  return { total, attendanceRate, estimatedValue, activePatients };
                };

                const stats = getFilteredStats();

                return (
                  <>
                    <div className="stats-grid">
                      <div className="card-premium">
                        <span className="card-label">Sessões no Período</span>
                        <div className="card-value">{stats.total}</div>
                        <span className="card-trend">{dashboardFilter === 'hoje' ? 'Agendadas p/ hoje' : 'Total agendado'}</span>
                      </div>
                      <div className="card-premium">
                        <span className="card-label">Taxa de Comparecimento</span>
                        <div className="card-value">{stats.attendanceRate}%</div>
                        <span className="card-trend positive">Das sessões realizadas</span>
                      </div>
                      <div className="card-premium">
                        <span className="card-label">Faturamento Estimado</span>
                        <div className="card-value">R$ {stats.estimatedValue}</div>
                        <span className="card-trend positive">Baseado no período</span>
                      </div>
                      <div className="card-premium">
                        <span className="card-label">Pacientes Ativos</span>
                        <div className="card-value">{stats.activePatients}</div>
                        <span className="card-trend">Com sessões no período</span>
                      </div>
                    </div>

                    <div className="dashboard-grid">
                      <div className="card-premium next-appointments">
                        <div className="card-header">
                          <h3>Próximos Atendimentos</h3>
                          <button className="btn-link" onClick={() => setActiveTab('calendar')}>Ver todos</button>
                        </div>
                        <div className="appointment-list">
                          {events
                            .filter(e => new Date(e.date + 'T00:00:00') >= new Date().setHours(0, 0, 0, 0))
                            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                            .slice(0, 5)
                            .map((app, i) => (
                              <div key={i} className="appointment-item">
                                <div className="time">
                                  {new Date(app.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  <br />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.time}</span>
                                </div>
                                <div className="patient-info">
                                  <strong>{app.patient}</strong>
                                  <span>{app.type}</span>
                                </div>
                                <button className="btn-action" onClick={() => setActiveTab('records')}>Prontuário</button>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="card-premium quick-actions">
                        <h3>Atalhos Rápidos</h3>
                        <div className="actions-grid">
                          <button className="action-button" onClick={() => { setShowAddPatientModal(true); setEditingPatient(null); }}>
                            <div className="action-icon"><Plus size={18} /></div>
                            Novo Paciente
                          </button>
                          <button className="action-button" onClick={() => setActiveTab('calendar')}>
                            <div className="action-icon"><Calendar size={18} /></div>
                            Agenda
                          </button>
                          <button className="action-button" onClick={() => setActiveTab('records')}>
                            <div className="action-icon"><Mic size={18} /></div>
                            Nota IA
                          </button>
                          <button className="action-button" onClick={() => setActiveTab('finance')}>
                            <div className="action-icon"><BarChart3 size={18} /></div>
                            Financeiro
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="patients-view animate-fade-in">
              {!selectedPatientForDetail ? (
                <>
                  <div className="view-header">
                    <div>
                      <h1>Gestão de Pacientes</h1>
                      <p>Centralize todas as informações dos seus pacientes.</p>
                    </div>
                    <button className="btn-primary" onClick={() => { setShowAddPatientModal(true); setEditingPatient(null); }}>
                      <Plus size={20} />
                      Adicionar Paciente
                    </button>
                  </div>

                  <div className="card-premium table-card">
                    <table className="patients-table">
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Contato</th>
                          <th>Última Sessão</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map(p => (
                          <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPatientForDetail(p)}>
                            <td>
                              <div className="patient-cell">
                                <div className="avatar-small">{p.name[0]}</div>
                                <strong>{p.name}</strong>
                              </div>
                            </td>
                            <td>
                              <div className="contact-info">
                                <span>{p.phone}</span>
                                <span className="sub">{p.email}</span>
                              </div>
                            </td>
                            <td>{p.lastSession}</td>
                            <td><span className="status-badge active">Em andamento</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-icon-table" title="Informações" onClick={(e) => { e.stopPropagation(); setSelectedPatientForDetail(p); }}>
                                  <ChevronRight size={18} />
                                </button>
                                <button className="btn-icon-table" title="Editar" onClick={(e) => { e.stopPropagation(); handleEditPatient(p); }}>
                                  <Edit3 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="patient-detail-view animate-slide-in">
                  <div className="view-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button className="btn-icon" onClick={() => setSelectedPatientForDetail(null)}>
                        <ChevronLeft size={24} />
                      </button>
                      <div>
                        <h1>{selectedPatientForDetail.name}</h1>
                        <p>{selectedPatientForDetail.email} • {selectedPatientForDetail.phone}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-outline" onClick={() => handleEditPatient(selectedPatientForDetail)}>Editar Cadastro</button>
                      <button className="btn-primary" onClick={() => {
                        setNewSession({ ...newSession, patient: selectedPatientForDetail.name });
                        setShowNewSessionModal(true);
                        setActiveTab('calendar');
                      }}>Agendar Sessão</button>
                    </div>
                  </div>

                  <div className="patient-tabs card-premium" style={{ display: 'flex', padding: '0', marginBottom: '20px', overflow: 'hidden' }}>
                    <button className={`tab-btn ${patientDetailTab === 'overview' ? 'active' : ''}`} onClick={() => setPatientDetailTab('overview')}>Visão Geral</button>
                    <button className={`tab-btn ${patientDetailTab === 'sessions' ? 'active' : ''}`} onClick={() => setPatientDetailTab('sessions')}>Sessões</button>
                    <button className={`tab-btn ${patientDetailTab === 'anamnesis' ? 'active' : ''}`} onClick={() => setPatientDetailTab('anamnesis')}>Anamnese</button>
                    <button className={`tab-btn ${patientDetailTab === 'summary' ? 'active' : ''}`} onClick={() => setPatientDetailTab('summary')}>Resumo das Sessões</button>
                  </div>

                  <div className="tab-content">
                    {patientDetailTab === 'overview' && (
                      <div className="animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                          <div className="card-premium info-section">
                            <div className="card-header">
                              <h3>📋 Dados do Paciente</h3>
                              <button className="btn-link" onClick={() => handleEditPatient(selectedPatientForDetail)}>Ver tudo</button>
                            </div>
                            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPF</label><div>{selectedPatientForDetail.cpf || '-'}</div></div>
                              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Frequência</label><div>{selectedPatientForDetail.frequency}</div></div>
                              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor/Sessão</label><div>R$ {selectedPatientForDetail.sessionValue}</div></div>
                              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contrato</label><div>Ativo</div></div>
                            </div>
                            <div style={{ marginTop: '15px' }}>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Endereço</label>
                              <div>{selectedPatientForDetail.address || 'Não informado'}</div>
                            </div>
                          </div>

                          <div className="card-premium">
                            <div className="card-header">
                              <h3>🗓️ Próximas Sessões</h3>
                              <button className="btn-link" onClick={() => setPatientDetailTab('sessions')}>Ver histórico</button>
                            </div>
                            <div className="appointment-list">
                              {events
                                .filter(e => e.patient === selectedPatientForDetail.name && new Date(e.date + 'T00:00:00') >= new Date().setHours(0, 0, 0, 0) && e.status !== 'rescheduled')
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .slice(0, 3)
                                .map(e => (
                                  <div key={e.id} className="appointment-item">
                                    <div className="time">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {e.time}</div>
                                    <div className="patient-info"><strong>{e.type}</strong></div>
                                  </div>
                                ))}
                              {events.filter(e => e.patient === selectedPatientForDetail.name && new Date(e.date + 'T00:00:00') >= new Date().setHours(0, 0, 0, 0)).length === 0 && (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhuma sessão agendada.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {patientDetailTab === 'sessions' && (
                      <div className="card-premium animate-fade-in" style={{ padding: '0' }}>
                        <div className="table-responsive">
                          <table className="patients-table">
                            <thead>
                              <tr>
                                <th>Data/Hora</th>
                                <th>Tipo</th>
                                <th>Status</th>
                                <th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {events
                                .filter(e => e.patient === selectedPatientForDetail.name)
                                .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
                                .map(e => (
                                  <tr key={e.id}>
                                    <td>{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {e.time}</td>
                                    <td>{e.type}</td>
                                    <td><span className={`status-badge ${e.status}`}>{e.status.replace('_', ' ')}</span></td>
                                    <td><button className="btn-link" onClick={() => setActiveTab('records')}>Prontuário</button></td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {patientDetailTab === 'anamnesis' && (
                      <div className="card-premium animate-fade-in">
                        <div className="card-header">
                          <h3>Ficha de Anamnese</h3>
                          <span>Paciente: {selectedPatientForDetail.name}</span>
                        </div>
                        <div className="form-group" style={{ marginTop: '20px' }}>
                          <textarea
                            className="form-input"
                            style={{ width: '100%', minHeight: '400px', padding: '20px', fontSize: '1rem', lineHeight: '1.6' }}
                            placeholder="Descreva aqui a história clínica, queixa principal, antecedentes familiares e marcos do desenvolvimento..."
                          ></textarea>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                          <button className="btn-primary">Salvar Ficha Clínica</button>
                        </div>
                      </div>
                    )}

                    {patientDetailTab === 'summary' && (
                      <div className="animate-fade-in">
                        <div className="card-premium" style={{ marginBottom: '20px' }}>
                          <div className="card-header">
                            <h3>📜 Evolução e Resumo</h3>
                            <button className="btn-primary" onClick={() => setActiveTab('records')}><Mic size={16} /> Nova Nota</button>
                          </div>
                          <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Consolidado automático das últimas sessões.</p>
                        </div>
                        <div className="session-history-list">
                          <div className="card-premium" style={{ background: 'var(--secondary-bg)', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <strong>Resumo da última semana</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>12 Dez 2025</span>
                            </div>
                            <p style={{ lineHeight: '1.5' }}>O paciente demonstrou progresso significativo na elaboração do conflito relatado anteriormente. Mantém foco em questões relacionadas ao ambiente de trabalho...</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="calendar-view animate-fade-in">
              <div className="view-header">
                <div>
                  <h1>Minha Agenda</h1>
                  <p>Gerencie seus horários e compromissos.</p>
                </div>
                <button className="btn-primary" onClick={() => setShowNewSessionModal(true)}>
                  <Plus size={20} />
                  Nova Sessão
                </button>
              </div>

              <div className="calendar-container card-premium">
                <div className="calendar-header">
                  <button className="nav-btn" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2>
                    {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button className="nav-btn" onClick={() => navigateMonth(1)}>
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="calendar-grid">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="calendar-day-header">{day}</div>
                  ))}

                  {(() => {
                    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
                    const days = [];

                    // Dias vazios antes do início do mês
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
                    }

                    // Dias do mês
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayEvents = getEventsForDate(day);
                      const isToday = day === new Date().getDate() &&
                        currentDate.getMonth() === new Date().getMonth() &&
                        currentDate.getFullYear() === new Date().getFullYear();

                      days.push(
                        <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                          <div className="day-number">{day}</div>
                          {dayEvents.length > 0 && (
                            <div className="day-events">
                              {dayEvents.map(event => (
                                <div
                                  key={event.id}
                                  className={`event-dot-container ${event.status}`}
                                >
                                  <div className="event-main-info">
                                    <span className="event-time">{event.time}</span>
                                    <span className="event-patient-name"> - {event.patient.split(' ')[0]}</span>
                                  </div>
                                  <div className="event-actions-quick">
                                    <button title="Confirmar" className="action-dot-btn confirm" onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'confirmed'); }}><Check size={10} /></button>
                                    <button title="Reagendar" className="action-dot-btn reschedule" onClick={(e) => { e.stopPropagation(); handleReschedule(event); }}><Calendar size={10} /></button>
                                    <button title="Falta Justificada" className="action-dot-btn excused" onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'excused_absence'); }}><MoreVertical size={10} /></button>
                                    <button title="Falta Não Justificada" className="action-dot-btn unexcused" onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'unexcused_absence'); }}><X size={10} /></button>
                                  </div>
                                </div>
                              ))}
                              {dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3}</span>}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>

                <div className="legend">
                  <div className="legend-item">
                    <div className="legend-dot confirmed"></div>
                    <span>Confirmado</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot pending"></div>
                    <span>Pendente</span>
                  </div>
                </div>
              </div>

              <div className="upcoming-sessions card-premium">
                <h3>Próximas Sessões</h3>
                <div className="sessions-list">
                  {events
                    .filter(e => {
                      // Fix de data para evitar problemas de fuso horário
                      const eventDate = new Date(e.date + 'T00:00:00');
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return eventDate >= today;
                    })
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 4)
                    .map(event => {
                      const eventParts = event.date.split('-');
                      const dayDisplay = eventParts[2];
                      const monthDisplay = new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' });

                      return (
                        <div key={event.id} className="session-item">
                          <div className="session-date">
                            <span className="date-day">{dayDisplay}</span>
                            <span className="date-month">{monthDisplay}</span>
                          </div>
                          <div className="session-details">
                            <strong>{event.patient}</strong>
                            <span>{event.time} • {event.type}</span>
                          </div>
                          <span className={`session-status ${event.status}`}>
                            {event.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="records-view animate-fade-in">
              <div className="view-header">
                <h1>Prontuários & Smart Notes</h1>
                <p>Economize horas de digitação com nossa IA.</p>
              </div>

              <div className="records-grid">
                <div className="card-premium session-input">
                  <div className="card-header">
                    <h3>Atendimento: <span className="highlight">Ana Clara Silva</span></h3>
                    <div className="session-timer">45:12</div>
                  </div>

                  <div className="recording-section">
                    <div className={`mic-animation ${isRecording ? 'active' : ''}`}>
                      <Mic size={48} className="mic-icon" />
                      {isRecording && <div className="waves"><span></span><span></span><span></span></div>}
                    </div>

                    <div className="recording-controls">
                      {!isRecording ? (
                        <button className="btn-record" onClick={handleStartRecording}>
                          <Play size={20} fill="currentColor" />
                          Começar Gravação
                        </button>
                      ) : (
                        <button className="btn-stop" onClick={handleStopRecording}>
                          <Square size={20} fill="currentColor" />
                          Parar Gravação
                        </button>
                      )}
                    </div>

                    <p className="hint">Fale naturalmente sobre a sessão. A IA cuidará do resto.</p>
                  </div>

                  {transcriptionStatus === 'processing' && (
                    <div className="processing-overlay">
                      <div className="loader"></div>
                      <p>IA processando e gerando resumo...</p>
                    </div>
                  )}

                  <div className="notes-area">
                    <label>Anotações Livres</label>
                    <textarea placeholder="Digite observações adicionais..."></textarea>
                  </div>
                </div>

                <div className="card-premium ai-output">
                  <div className="card-header">
                    <h3><Sparkles size={18} className="icon-sparkle" /> Resumo da IA</h3>
                    {transcriptionStatus === 'done' && (
                      <button className="btn-outline-small">Exportar PDF</button>
                    )}
                  </div>

                  <div className={`ai-content ${transcriptionStatus === 'done' ? 'ready' : 'empty'}`}>
                    {transcriptionStatus === 'done' ? (
                      <div className="ai-summary">
                        <h4>Objetivos da Sessão</h4>
                        <p>Trabalhar a ansiedade social e estratégias de enfrentamento para a nova vaga de emprego.</p>

                        <h4>Evolução</h4>
                        <p>A paciente apresentou melhora na identificação de gatilhos emocionais. Discutimos a técnica de respiração diafragmática.</p>

                        <h4>Plano Terapêutico</h4>
                        <p>Manter acompanhamento semanal. Lição: registrar pensamentos automáticos no diário.</p>

                        <div className="validation-footer">
                          <CheckCircle2 size={16} /> Conformidade LGPD
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <FileText size={40} />
                        <p>O resumo aparecerá após processar a gravação.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="finance-view animate-fade-in">
              <div className="view-header">
                <h1>Financeiro & Gestão Fiscal</h1>
                <p>Monitore seu faturamento e otimize seus impostos (Anexo 3).</p>
              </div>

              <div className="stats-grid">
                <div className="card-premium">
                  <span className="card-label">Total a Receber (Mês)</span>
                  <div className="card-value">R$ 12.450</div>
                  <span className="card-trend positive">+12% vs mês anterior</span>
                </div>
                <div className="card-premium">
                  <span className="card-label">Imposto Estimado (6%)</span>
                  <div className="card-value">R$ 747</div>
                  <span className="card-trend">Baseado no Anexo 3</span>
                </div>
                <div className="card-premium">
                  <span className="card-label">Otimização Fiscal</span>
                  <div className="card-value">Fator R</div>
                  <span className="card-trend positive">Ativo (Pró-labore 28%)</span>
                </div>
              </div>

              <div className="finance-layout">
                <div className="finance-main">
                  <div className="finance-cards-grid">
                    {patients.map(patient => {
                      const contract = contracts.find(c => c.patientId === patient.id);
                      const monthlyValue = contract ? calculateMonthlyValue(contract) : 0;

                      return (
                        <div
                          key={patient.id}
                          className="card-finance-premium"
                          onClick={() => {
                            setSelectedFinancePatient(patient);
                            setShowFinanceDetail(true);
                          }}
                        >
                          <div className="card-finance-header">
                            <div className="patient-avatar-finance">{patient.name[0]}</div>
                            <div className="patient-info-finance">
                              <h4>{patient.name}</h4>
                              <span>{patient.frequency} • R$ {patient.sessionValue}/sessão</span>
                            </div>
                          </div>
                          <div className="card-finance-body">
                            <div className="finance-stat">
                              <label>Este Mês (Sessões)</label>
                              <div className="value">{getSessionsCount(patient.name)} sessões</div>
                            </div>
                            <div className="finance-stat">
                              <label>Total a Receber</label>
                              <div className="value primary-color">R$ {monthlyValue}</div>
                            </div>
                          </div>
                          <div className="card-finance-footer">
                            <span>Ver Histórico & Pagamentos</span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="card-premium nf-reminder-card">
                    <div className="card-header">
                      <h3>📅 Notas a Emitir (Este Mês)</h3>
                    </div>
                    <div className="nf-list">
                      {contracts.filter(c => c.requiresNF).map(c => (
                        <div key={c.id} className="nf-item">
                          <div className="nf-info">
                            <strong>{c.patientName}</strong>
                            <span>Vencimento: Dia {c.paymentDay}</span>
                          </div>
                          <div className="nf-value">R$ {calculateMonthlyValue(c)}</div>
                          <button className="btn-action" onClick={() => handleSendNFEmail(c)}>Emitir NF</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="finance-sidebar">
                  <div className="card-premium tax-strategy-card">
                    <div className="card-header">
                      <h3>💻 Gestão Fiscal</h3>
                    </div>
                    <div className="strategy-content">
                      <p>Como Psicóloga(o) em uma <strong>LTDA</strong>, você está no <strong>Anexo 3</strong> do Simples Nacional.</p>
                      <div className="strategy-item">
                        <strong>Estratégia Fator R</strong>
                        <p>Para manter a alíquota de <strong>6%</strong> (em vez de 15,5%), seu Pró-labore deve ser 28% do faturamento.</p>
                      </div>
                      <div className="strategy-item">
                        <strong>Seu Planejamento</strong>
                        <p>Definimos o <strong>mínimo de Pró-labore</strong> necessário para atingir o Fator R de forma legal.</p>
                      </div>
                      <div className="tax-economy">
                        <Sparkles size={16} />
                        <span>Economia Fiscal: <strong>~R$ 1.180</strong></span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="marketing-view animate-fade-in">
              <div className="view-header">
                <h1>Marketing IA</h1>
                <p>Crie posts e gerencie sua presença nas redes sociais.</p>
              </div>
              <div className="card-premium empty-state-card">
                <Sparkles size={48} className="icon-sparkle" />
                <h2>Módulo em Desenvolvimento</h2>
                <p>Em breve você poderá gerar conteúdo estratégico com nossa IA especializada em psicologia.</p>
                <button className="btn-primary" style={{ marginTop: '20px' }}>Notificar quando pronto</button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modal de Configurações */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Personalizar Perfil</h2>
              <button className="btn-close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="avatar-section">
                <label>Foto de Perfil</label>
                <div className="avatar-upload">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="Avatar" className="avatar-preview" />
                  ) : (
                    <div className="avatar-preview-empty">{userProfile.initials}</div>
                  )}
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="btn-upload">
                    <Upload size={18} />
                    Enviar Foto
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Iniciais (para avatar)</label>
                <input
                  type="text"
                  value={userProfile.initials}
                  onChange={(e) => setUserProfile({ ...userProfile, initials: e.target.value.toUpperCase() })}
                  className="form-input"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label>Tema de Cores</label>
                <ThemeSelector currentTheme={userProfile.theme} onSelect={handleThemeChange} />
              </div>

              <button className="btn-primary btn-save" onClick={() => setShowSettings(false)}>
                Salvar Alterações
              </button>

              <div className="settings-section" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Gestão de Dados</label>

                {lastBackupDate && !isNaN(new Date(lastBackupDate).getTime()) && (
                  <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <strong>Último Backup:</strong> {new Date(lastBackupDate).toLocaleDateString('pt-BR')} às {new Date(lastBackupDate).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                )}

                <div className="backup-controls" style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-outline-small" onClick={handleExportData}>
                    <Download size={18} />
                    Exportar Backup
                  </button>
                  <label className="btn-outline-small" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} />
                    Importar Backup
                    <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Sessão */}
      {showNewSessionModal && (
        <div className="modal-overlay" onClick={() => setShowNewSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Sessão</h2>
              <button className="btn-close" onClick={() => setShowNewSessionModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="form-group">
                <label>Paciente</label>
                <select
                  value={newSession.patient}
                  onChange={(e) => setNewSession({ ...newSession, patient: e.target.value })}
                  className="form-input"
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Data</label>
                <input
                  type="date"
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Horário</label>
                <input
                  type="time"
                  value={newSession.time}
                  onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Tipo de Atendimento</label>
                <select
                  value={newSession.type}
                  onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                  className="form-input"
                >
                  <option value="Psicoterapia">Psicoterapia</option>
                  <option value="Avaliação">Avaliação</option>
                  <option value="Retorno">Retorno</option>
                  <option value="Primeira Consulta">Primeira Consulta</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={newSession.status}
                  onChange={(e) => setNewSession({ ...newSession, status: e.target.value })}
                  className="form-input"
                >
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                </select>
              </div>

              <button className="btn-primary btn-save" onClick={handleAddSession}>
                Agendar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contrato */}
      {showContractModal && editingContract && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Contrato: {editingContract.patientName}</h2>
              <button className="btn-close" onClick={() => setShowContractModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="form-group">
                <label>Valor por Sessão (R$)</label>
                <input
                  type="number"
                  value={editingContract.value}
                  onChange={(e) => setEditingContract({ ...editingContract, value: Number(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Dia do Pagamento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editingContract.paymentDay}
                  onChange={(e) => setEditingContract({ ...editingContract, paymentDay: Number(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Frequência</label>
                <select
                  value={editingContract.frequency}
                  onChange={(e) => setEditingContract({ ...editingContract, frequency: e.target.value })}
                  className="form-input"
                >
                  <option value="Semanal">Semanal</option>
                  <option value="Quinzenal">Quinzenal</option>
                  <option value="Mensal">Mensal</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status do Contrato</label>
                <select
                  value={editingContract.status}
                  onChange={(e) => setEditingContract({ ...editingContract, status: e.target.value })}
                  className="form-input"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Suspenso">Suspenso</option>
                  <option value="Encerrado">Encerrado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editingContract.requiresNF}
                    onChange={(e) => setEditingContract({ ...editingContract, requiresNF: e.target.checked })}
                  />
                  Emitir Nota Fiscal (NF) para este paciente
                </label>
              </div>

              <button className="btn-primary btn-save" onClick={() => handleUpdateContract(editingContract)}>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhe Financeiro */}
      {showFinanceDetail && selectedFinancePatient && (
        <div className="modal-overlay" onClick={() => setShowFinanceDetail(false)}>
          <div className="modal-content finance-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-info">
                <h2>{selectedFinancePatient.name}</h2>
                <span className="patient-meta">{selectedFinancePatient.frequency} • R$ {selectedFinancePatient.sessionValue}/sessão</span>
              </div>
              <button className="btn-close" onClick={() => setShowFinanceDetail(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="finance-tabs">
                <div className="finance-tab active">Histórico de Sessões</div>
              </div>

              <div className="session-history-list">
                {(() => {
                  const months = [];
                  const now = new Date();
                  for (let i = 0; i < 6; i++) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                    const monthEvents = events.filter(e => {
                      const eDate = new Date(e.date + 'T00:00:00');
                      return eDate.getMonth() === d.getMonth() &&
                        eDate.getFullYear() === d.getFullYear() &&
                        e.patient === selectedFinancePatient.name &&
                        (e.status === 'confirmed' || e.status === 'unexcused_absence');
                    });

                    months.push(
                      <div key={monthName} className="history-month-item">
                        <div className="month-info">
                          <strong style={{ textTransform: 'capitalize' }}>{monthName}</strong>
                          <span>{monthEvents.length} sessões confirmadas</span>
                        </div>
                        <div className="month-total">
                          R$ {monthEvents.length * (selectedFinancePatient.sessionValue || 0)}
                        </div>
                      </div>
                    );
                  }
                  return months;
                })()}
              </div>

              <div className="payment-history-section">
                <h3>Pagamentos</h3>
                <div className="payment-status-card">
                  <div className="payment-indicator paid"></div>
                  <div className="payment-details">
                    <strong>Dezembro 2025</strong>
                    <span>Status: Pago em 05/12</span>
                  </div>
                  <div className="payment-value">R$ {calculateMonthlyValue(contracts.find(c => c.patientId === selectedFinancePatient.id))}</div>
                </div>
              </div>

              <div className="detail-actions">
                <button className="btn-primary" onClick={() => handleSendNFEmail(contracts.find(c => c.patientId === selectedFinancePatient.id))}>
                  Enviar Dados p/ NF
                </button>
                <button className="btn-outline" onClick={() => handleEditPatient(selectedFinancePatient)}>
                  Editar Cadastro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Paciente */}
      {showAddPatientModal && (
        <div className="modal-overlay" onClick={() => setShowAddPatientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Paciente</h2>
              <button className="btn-close" onClick={() => setShowAddPatientModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Ana Silva"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="paciente@exemplo.com"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Endereço Residencial</label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>CPF (Necessário para NF)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={newPatient.cpf}
                    onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Valor por Sessão (R$)</label>
                  <input
                    type="number"
                    value={newPatient.sessionValue}
                    onChange={(e) => setNewPatient({ ...newPatient, sessionValue: Number(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Frequência</label>
                  <select
                    value={newPatient.frequency}
                    onChange={(e) => setNewPatient({ ...newPatient, frequency: e.target.value })}
                    className="form-input"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '28px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newPatient.requiresNF}
                      onChange={(e) => setNewPatient({ ...newPatient, requiresNF: e.target.checked })}
                    />
                    Requer Nota Fiscal
                  </label>
                </div>
              </div>

              <button className="btn-primary btn-save" onClick={editingPatient ? handleUpdatePatient : handleAddPatient}>
                {editingPatient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
