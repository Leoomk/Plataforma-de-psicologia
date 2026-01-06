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
  Download,
  Database,
  Copy,
  Save,
  Trash2,
  MicOff,
  User,
  DollarSign,
  AlertTriangle,
  UserX,
  Trash
} from 'lucide-react';
import './App.css';
const formatBRL = (value) => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

const formatLocalDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR');
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getPaymentData = (patientId, month, year, contract, paymentStatuses, events) => {
  const key = `${patientId}-${month}-${year}`;
  const entry = paymentStatuses[key];

  const status = typeof entry === 'object' ? entry.status : entry;
  const customValue = typeof entry === 'object' ? entry.customValue : null;

  if (status && status !== 'pendente') return { status, customValue };

  // Se for ANTECIPADO, não tem atraso por data
  if (contract?.billingMode === 'Mensal Antecipado') {
    return { status: "a_vencer", customValue };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Lógica se for MENSAL ou Padrão antigo
  if (!contract || contract.billingMode === 'Mensal') {
    const paymentDay = contract?.paymentDay || 5;
    const dueDate = new Date(year, month, paymentDay);

    // Ignorar meses sem atendimentos (valor 0) para nÉo gerar alertas falsos de atraso
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();
    const sessions = events.filter(e => {
      const eDate = parseLocalDate(e.date);
      return eDate && eDate.getMonth() === prevMonth && eDate.getFullYear() === prevYear && e.patient === contract?.patientName && (e.status === 'confirmed' || e.status === 'unexcused_absence');
    }).length;

    if (sessions === 0 && customValue === null) return { status: "a_vencer", customValue };

    if (today > dueDate) return { status: "atrasado", customValue };
    return { status: "a_vencer", customValue };
  }

  // Lógica se for POR sessão
  if (contract.billingMode === 'Por sessão') {
    const dueDays = contract.dueDaysAfterSession || 2;

    const monthEvents = events.filter(e => {
      const eDate = parseLocalDate(e.date);
      return eDate && eDate.getMonth() === month &&
        eDate.getFullYear() === year &&
        e.patient === contract.patientName &&
        (e.status === 'confirmed' || e.status === 'unexcused_absence');
    });

    if (monthEvents.length === 0) return { status: "a_vencer", customValue };

    const hasOverdueSession = monthEvents.some(e => {
      const eDate = parseLocalDate(e.date);
      const dueDate = new Date(eDate);
      dueDate.setDate(dueDate.getDate() + dueDays);
      return today > dueDate;
    });

    if (hasOverdueSession) return { status: "atrasado", customValue };
    return { status: "a_vencer", customValue };
  }

  return { status: "a_vencer", customValue };
};

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

  // Estados para Prontuários
  const [selectedRecordEventId, setSelectedRecordEventId] = useState('');
  const [recordData, setRecordData] = useState({
    transcription: '',
    aiPrompt: `Sou psicóloga analista do comportamento. Quero que o chat me responda seguindo essas orientações:

IntroduçÉo: breve contextualizaçÉo acadêmica, destacando relevÉncia teórica ou prática.
Desenvolvimento: explicaçÉo técnica e coerente de conceitos da Psicologia Científica, articulada com exemplos aplicáveis em clínica, docência e tecnologia.
ConclusÉo: implicações práticas bem delimitadas e sugestões objetivas para aprofundamento.

## Linguagem Técnica e Acadêmica
- Vocabulário técnico preciso, com definições claras.
- Tom intermediário, equilibrando formalidade acadêmica e proximidade empática.
- Evite expressões genéricas ou senso comum.

## Uso de Elementos Visuais
- Priorize tabelas comparativas e listas sucintas.

## Referências Atualizadas
- Inclua ao menos 3 referências científicas recentes (últimos 5 anos), formatadas rigorosamente em APA.
- Utilize fontes acadêmicas confiáveis.

## Recomendações Finais
- Enfatize claramente as interações organismo-ambiente.
- Privilegie exemplos concretos e contextualizados.
- Peça esclarecimentos sempre que necessário; nunca invente informações.`,
    aiAnalysis: ''
  });
  const [isRecordingReal, setIsRecordingReal] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [recordFilterDate, setRecordFilterDate] = useState('');
  const [recordFilterPatient, setRecordFilterPatient] = useState('');

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
      requiresNF: true,
      lastSession: '12/12/2025'
    },
  ]));

  const [events, setEvents] = useState(() => loadInitialState('events', [
    { id: 1, date: '2025-12-19', time: '14:00', patient: 'Ana Clara Silva', type: 'Psicoterapia', status: 'confirmed' },
    { id: 2, date: '2025-12-19', time: '15:30', patient: 'Carlos Santos', type: 'AvaliaçÉo', status: 'confirmed' },
    { id: 3, date: '2025-12-20', time: '10:00', patient: 'Juliana Mendes', type: 'Psicoterapia', status: 'pending' },
    { id: 4, date: '2025-12-21', time: '16:00', patient: 'Marcos Oliveira', type: 'Retorno', status: 'confirmed' },
  ]));

  const [contracts, setContracts] = useState(() => loadInitialState('contracts', [
    { id: 1, patientId: 1, patientName: 'Ana Clara Silva', value: 200, paymentDay: 5, billingMode: 'Mensal', status: 'Ativo', requiresNF: true },
    { id: 2, patientId: 2, patientName: 'Carlos Eduardo Santos', value: 180, paymentDay: 10, billingMode: 'Mensal', status: 'Ativo', requiresNF: false },
    { id: 3, patientId: 3, patientName: 'Juliana Mendes', value: 250, paymentDay: 15, billingMode: 'Mensal', status: 'Ativo', requiresNF: true },
    { id: 4, patientId: 4, patientName: 'Marcos Oliveira', value: 150, paymentDay: 20, billingMode: 'Mensal', status: 'Suspenso', requiresNF: false },
  ]));

  const [payments, setPayments] = useState(() => loadInitialState('payments', [
    { id: 1, patientName: 'Ana Clara Silva', date: '2025-12-05', value: 200, status: 'Pago' },
    { id: 2, patientName: 'Carlos Eduardo Santos', date: '2025-12-10', value: 180, status: 'Pendente' },
    { id: 3, patientName: 'Juliana Mendes', date: '2025-12-15', value: 250, status: 'Atrasado' },
  ]));

  const [editingContract, setEditingContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [financeFilterMonth, setFinanceFilterMonth] = useState(new Date().getMonth());
  const [financeFilterYear, setFinanceFilterYear] = useState(new Date().getFullYear());
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    sessionValue: 200,
    billingMode: 'Mensal',
    paymentDay: 5,
    dueDaysAfterSession: 2,
    credits: 0,
    requiresNF: false
  });
  const [selectedFinancePatient, setSelectedFinancePatient] = useState(null);
  const [activePatientMenuId, setActivePatientMenuId] = useState(null);
  const [showFinanceDetail, setShowFinanceDetail] = useState(false);
  const [newSession, setNewSession] = useState({
    patient: '',
    date: '',
    time: '',
    type: 'Psicoterapia',
    status: 'pending'
  });
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);
  const [showFaltaMenuId, setShowFaltaMenuId] = useState(null);
  const [showDeletePatientModal, setShowDeletePatientModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: '', credits: 1, date: new Date().toISOString().split('T')[0] });
  const [creditTarget, setCreditTarget] = useState({ patient: null, month: null, year: null });

  const [paymentStatuses, setPaymentStatuses] = useState(() => loadInitialState('paymentStatuses', {}));

  const handleUpdatePaymentStatus = (patientId, month, year, status, customValue = undefined, romaneio = null) => {
    const key = `${patientId}-${month}-${year}`;
    setPaymentStatuses(prev => {
      const newState = { ...prev };
      const current = typeof prev[key] === 'object' ? prev[key] : { status: prev[key] || '', customValue: null, transactions: [] };

      const newTransactions = romaneio ? [...(current.transactions || []), romaneio] : (current.transactions || []);

      newState[key] = {
        status: status !== null ? status : current.status,
        customValue: customValue !== undefined ? customValue : (current.customValue || null),
        transactions: newTransactions
      };

      if (newState[key].status === 'pendente' && newState[key].customValue === null && (!newState[key].transactions || newState[key].transactions.length === 0)) {
        delete newState[key];
      }

      return newState;
    });
  };

  const handleCancelTransaction = (patientId, month, year, transactionId) => {
    const key = `${patientId}-${month}-${year}`;
    const patient = patients.find(p => p.id === patientId);
    setPaymentStatuses(prev => {
      const newState = { ...prev };
      const entry = newState[key];
      if (!entry || !entry.transactions) return prev;

      const trans = entry.transactions.find(t => t.id === transactionId);
      if (trans && patient) {
        // Estornar créditos
        setPatients(prevPats => prevPats.map(p => p.id === patientId ? { ...p, credits: (p.credits || 0) - (trans.credits || 0) } : p));
      }

      newState[key].transactions = entry.transactions.filter(t => t.id !== transactionId);
      if (newState[key].transactions.length === 0 && newState[key].status === 'pago') {
        newState[key].status = 'pendente';
      }
      return newState;
    });
  };

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

  useEffect(() => {
    saveState('paymentStatuses', paymentStatuses);
  }, [paymentStatuses]);

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

  const handleAddCredit = () => {
    const { amount, credits, date } = creditForm;
    const { patient, month, year } = creditTarget;

    if (patient && amount && credits) {
      const romaneio = {
        id: Date.now(),
        date: new Date(date).toISOString(),
        amount: parseFloat(amount),
        credits: parseInt(credits)
      };

      handleUpdatePaymentStatus(patient.id, month, year, 'pago', undefined, romaneio);
      setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, credits: (p.credits || 0) + parseInt(credits) } : p));

      setShowCreditModal(false);
      setCreditForm({ amount: '', credits: 1, date: new Date().toISOString().split('T')[0] });
    }
  };


  // ConfiguraçÉo do Reconhecimento de Voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'pt-BR';

      recognitionInstance.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setRecordData(prev => ({
            ...prev,
            transcription: prev.transcription + ' ' + finalTranscript
          }));
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsRecordingReal(false);
      };

      recognitionInstance.onend = () => {
        setIsRecordingReal(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecordingReal) {
      recognition?.stop();
    } else {
      try {
        recognition?.start();
        setIsRecordingReal(true);
      } catch (e) {
        console.error("Erro ao iniciar:", e);
      }
    }
  };

  // Carregar dados quando seleciona uma sessÉo
  useEffect(() => {
    if (selectedRecordEventId) {
      const event = events.find(e => e.id === Number(selectedRecordEventId));
      if (event && event.prontuario) {
        setRecordData({
          transcription: event.prontuario.transcription || '',
          aiPrompt: event.prontuario.aiPrompt || recordData.aiPrompt, // Mantém o default se vazio
          aiAnalysis: event.prontuario.aiAnalysis || ''
        });
      } else {
        // Resetar se nÉo tiver dados salvos (mantendo o prompt PadrÉo)
        setRecordData(prev => ({
          transcription: '',
          aiPrompt: prev.aiPrompt, // Mantém o prompt atual/PadrÉo
          aiAnalysis: ''
        }));
      }
    }
  }, [selectedRecordEventId]);

  const handleSaveRecord = () => {
    if (!selectedRecordEventId) return;

    const updatedEvents = events.map(e => {
      if (e.id === Number(selectedRecordEventId)) {
        return {
          ...e,
          prontuario: { ...recordData }
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    alert('Prontuário salvo com sucesso!');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
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

  const handleNavigateToRecord = (event) => {
    setSelectedRecordEventId(event.id);
    setActiveTab('records');
    setSelectedPatientForDetail(null); // Fecha o detalhe do paciente se estiver aberto
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
    const subject = encodeURIComponent(`EmissÉo de NF - ${contract.patientName} - Mês ${new Date().getMonth() + 1}`);
    const body = encodeURIComponent(
      `Olá,\n\nFavor emitir a Nota Fiscal para o paciente abaixo:\n\n` +
      `Nome: ${contract.patientName}\n` +
      `Valor: ${formatBRL(calculateMonthlyValue(contract))}\n` +
      `Referência: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\n\n` +
      `Obrigada!`
    );
    window.location.href = `mailto:contabilidade@exemplo.com?subject=${subject}&body=${body}`;
  };

  const calculateMonthlyValue = (contract, month = undefined, year = undefined) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();

    // Primeiro verifica se há valor manual salvo
    const pData = getPaymentData(contract.patientId, targetMonth, targetYear, contract, paymentStatuses, events);
    if (pData.customValue !== null) return Number(pData.customValue);

    if (contract.billingMode === 'Mensal') {
      const prevMonthDate = new Date(targetYear, targetMonth - 1, 1);
      const prevMonth = prevMonthDate.getMonth();
      const prevYear = prevMonthDate.getFullYear();

      const sessionsInPrevMonth = events.filter(e => {
        const eDate = parseLocalDate(e.date);
        return eDate && eDate.getMonth() === prevMonth &&
          eDate.getFullYear() === prevYear &&
          e.patient === contract.patientName &&
          (e.status === 'confirmed' || e.status === 'unexcused_absence');
      }).length;

      return contract.value * sessionsInPrevMonth;
    }

    // Mensal Antecipado ou Por sessÉo (No mês atual)
    const sessionsInMonth = events.filter(e => {
      const eDate = parseLocalDate(e.date);
      return eDate && eDate.getMonth() === targetMonth &&
        eDate.getFullYear() === targetYear &&
        e.patient === contract.patientName &&
        (e.status === 'confirmed' || e.status === 'unexcused_absence');
    }).length;

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

      // Criar contrato PadrÉo para o novo paciente
      setContracts([...contracts, {
        id: contracts.length + 1,
        patientId: id,
        patientName: newPatient.name,
        value: newPatient.sessionValue,
        paymentDay: newPatient.billingMode === 'Mensal' ? newPatient.paymentDay : null,
        billingMode: newPatient.billingMode,
        dueDaysAfterSession: newPatient.billingMode === 'Por sessÉo' ? newPatient.dueDaysAfterSession : null,
        status: 'Ativo',
        requiresNF: newPatient.requiresNF
      }]);

      setNewPatient({
        name: '', email: '', phone: '', cpf: '',
        address: '', sessionValue: 200, billingMode: 'Mensal',
        paymentDay: 5, dueDaysAfterSession: 2, credits: 0, requiresNF: false
      });
      setShowAddPatientModal(false);
    }
  };

  const handleEditPatient = (patient) => {
    const contract = contracts.find(c => c.patientId === patient.id);
    setEditingPatient(patient);
    setNewPatient({
      ...patient,
      billingMode: contract?.billingMode || 'Mensal',
      paymentDay: contract?.paymentDay || 5,
      dueDaysAfterSession: contract?.dueDaysAfterSession || 2
    });
    setShowAddPatientModal(true);
  };

  const handleDeletePatient = (id) => {
    const p = patients.find(pat => pat.id === id);
    if (p) {
      setPatientToDelete(p);
      setShowDeletePatientModal(true);
      setActivePatientMenuId(null);
    }
  };

  const confirmDeletePatient = () => {
    if (!patientToDelete) return;
    const id = patientToDelete.id;

    setPatients(patients.filter(p => p.id !== id));
    setContracts(contracts.filter(c => c.patientId !== id));
    setEvents(events.filter(e => e.patient !== patientToDelete.name));

    setShowDeletePatientModal(false);
    setPatientToDelete(null);
    alert('Paciente e todos os dados vinculados foram removidos permanentemente.');
  };

  const handleUpdatePatient = () => {
    if (newPatient.name && editingPatient) {
      setPatients(patients.map(p => p.id === editingPatient.id ? { ...newPatient } : p));

      // Atualizar contrato se existir
      setContracts(contracts.map(c => c.patientId === editingPatient.id ? {
        ...c,
        patientName: newPatient.name,
        value: newPatient.sessionValue,
        billingMode: newPatient.billingMode,
        paymentDay: newPatient.billingMode === 'Mensal' ? newPatient.paymentDay : null,
        dueDaysAfterSession: newPatient.billingMode === 'Por sessÉo' ? newPatient.dueDaysAfterSession : null,
        requiresNF: newPatient.requiresNF
      } : c));

      setEditingPatient(null);
      setNewPatient({
        name: '', email: '', phone: '', cpf: '',
        address: '', sessionValue: 200, billingMode: 'Mensal',
        paymentDay: 5, dueDaysAfterSession: 2, credits: 0, requiresNF: false
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
    const event = events.find(e => e.id === id);
    if (!event) return;

    const oldStatus = event.status;
    const patient = patients.find(p => p.name === event.patient);
    const contract = contracts.find(c => c.patientId === patient?.id);
    const isAntecipado = contract?.billingMode === 'Mensal Antecipado';

    setEvents(events.map(e => e.id === id ? { ...e, status: newStatus } : e));

    if (isAntecipado && patient) {
      const wasConsumed = oldStatus === 'confirmed' || oldStatus === 'unexcused_absence';
      const willConsume = newStatus === 'confirmed' || newStatus === 'unexcused_absence';

      if (!wasConsumed && willConsume) {
        // Consumir 1 crédito
        setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, credits: (p.credits || 0) - 1 } : p));
      } else if (wasConsumed && !willConsume) {
        // Estornar 1 crédito
        setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, credits: (p.credits || 0) + 1 } : p));
      }
    }
  };

  const handleReschedule = (event) => {
    // Marcar atual como reagendado
    updateEventStatus(event.id, 'rescheduled');
    // Preparar nova sessÉo com mesmos dados
    setNewSession({
      patient: event.patient,
      date: '', // Limpa para obrigar a escolher nova data
      time: event.time,
      type: event.type,
      status: 'pending'
    });
    setShowNewSessionModal(true);
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm("Deseja realmente excluir esta sessÉo permanentemente?")) {
      const event = events.find(e => e.id === id);
      // Se era confirmada e tinha crédito abatido, ele NÉƒO volta automaticamente?
      // O usuário pediu "excluir" e falou de "estornar" no romaneio.
      // Vou apenas excluir a sessÉo da lista.
      setEvents(events.filter(e => e.id !== id));
    }
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
          <div className="logo-icon">’</div>
          <h2>Plataforma de<br />Psicologia</h2>
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
          <SidebarItem
            icon={Database}
            label="GestÉo de Dados"
            active={activeTab === 'data_management'}
            onClick={() => setActiveTab('data_management')}
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

          <div style={{ marginRight: 'auto', marginLeft: '20px' }}>
            {lastBackupDate && !isNaN(new Date(lastBackupDate).getTime()) && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                ’¾ Utilizando arquivo salvo em <strong>{new Date(lastBackupDate).toLocaleDateString('pt-BR')}</strong>
              </span>
            )}
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

                  // Faturamento estimado (considerando valor da sessÉo do contrato)
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
                        <div className="card-value">{formatBRL(stats.estimatedValue)}</div>
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
                                  {(() => {
                                    const [y, m, d] = app.date.split('-');
                                    return `${d}/${m}`;
                                  })()}
                                  <br />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.time}</span>
                                </div>
                                <div className="patient-info">
                                  <strong>
                                    {app.patient}
                                    {(() => {
                                      const p = patients.find(patient => patient.name === app.patient);
                                      const c = contracts.find(contract => contract.patientId === p?.id);
                                      if (c?.billingMode === 'Mensal Antecipado' && (p?.credits || 0) <= 0) {
                                        return <span title="Sem créditos" style={{ color: '#f43f5e', marginLeft: '4px' }}>🔴</span>;
                                      }
                                      return null;
                                    })()}
                                  </strong>
                                  <span>{app.type}</span>
                                </div>

                                <div className="event-actions-quick" style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '8px', marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                                  <button title="Confirmar" className="action-dot-btn confirm" onClick={(e) => { e.stopPropagation(); updateEventStatus(app.id, 'confirmed'); }}><Check size={12} /></button>
                                  <button title="Cancelar" className="action-dot-btn" onClick={(e) => { e.stopPropagation(); updateEventStatus(app.id, 'pending'); }}><X size={12} /></button>
                                  <div className="falta-group" style={{ display: 'flex', gap: '2px' }}>
                                    <button title="Falta Justificada" className="action-dot-btn excused" style={{ fontSize: '9px', width: '24px', background: '#f59e0b20', color: '#f59e0b' }} onClick={(e) => { e.stopPropagation(); updateEventStatus(app.id, 'excused_absence'); }}>FJ</button>
                                    <button title="Falta NÉo Justificada" className="action-dot-btn unexcused" style={{ fontSize: '9px', width: '24px' }} onClick={(e) => { e.stopPropagation(); updateEventStatus(app.id, 'unexcused_absence'); }}>FN</button>
                                  </div>
                                  <button title="Excluir" className="action-dot-btn" style={{ color: '#f43f5e' }} onClick={(e) => { e.stopPropagation(); handleDeleteEvent(app.id); }}><Trash2 size={12} /></button>
                                </div>
                                <button className="btn-action" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '8px' }} onClick={() => setActiveTab('records')}>Prontuário</button>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="card-premium quick-actions">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h3 style={{ margin: 0 }}>Cobranças e Vencimentos</h3>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-link" onClick={() => setShowAllAlertsModal(true)} style={{ fontSize: '0.8rem' }}>Ver Todos</button>
                            <button className="btn-link" onClick={() => setActiveTab('finance')} style={{ fontSize: '0.8rem' }}>Ver Financeiro</button>
                          </div>
                        </div>
                        <div className="appointment-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                          {(() => {
                            const alerts = [];
                            const now = new Date();
                            const m = now.getMonth();
                            const y = now.getFullYear();

                            patients.forEach(p => {
                              const contract = contracts.find(c => c.patientId === p.id);
                              if (contract?.billingMode === 'Mensal Antecipado' && (p.credits || 0) <= 0) {
                                alerts.push({
                                  type: 'atrasado',
                                  patient: p,
                                  contract: contract,
                                  label: 'Créditos Esgotados',
                                  month: m,
                                  year: y
                                });
                              }
                              if (!contract) return;

                              // Verificar os últimos 6 meses em busca de atrasos
                              for (let i = 5; i >= 0; i--) {
                                const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                const checkMonth = checkDate.getMonth();
                                const checkYear = checkDate.getFullYear();

                                const statusData = getPaymentData(p.id, checkMonth, checkYear, contract, paymentStatuses, events);

                                if (statusData.status === 'atrasado') {
                                  let label = '';
                                  if (contract.billingMode === 'Por SessÉo') {
                                    const monthEvents = events.filter(e => {
                                      const ed = parseLocalDate(e.date);
                                      return ed && ed.getMonth() === checkMonth && ed.getFullYear() === checkYear &&
                                        e.patient === p.name && (e.status === 'confirmed' || e.status === 'unexcused_absence');
                                    });
                                    const firstOverdue = monthEvents.find(e => {
                                      const ed = parseLocalDate(e.date);
                                      const sd = new Date(ed);
                                      sd.setDate(sd.getDate() + (contract.dueDaysAfterSession || 2));
                                      return now > sd;
                                    }) || monthEvents[0];

                                    if (firstOverdue) {
                                      const ed = parseLocalDate(firstOverdue.date);
                                      const sd = new Date(ed);
                                      sd.setDate(sd.getDate() + (contract.dueDaysAfterSession || 2));
                                      label = `Atrasado: ${sd.toLocaleDateString('pt-BR')}`;
                                    } else {
                                      label = 'Prazos de sessÉo vencidos';
                                    }
                                  } else {
                                    const day = contract.paymentDay || 5;
                                    label = `Atrasado: ${String(day).padStart(2, '0')}/${String(checkMonth + 1).padStart(2, '0')}/${checkYear}`;
                                  }

                                  alerts.push({
                                    type: 'atrasado',
                                    patient: p,
                                    contract: contract,
                                    label: label,
                                    month: checkMonth,
                                    year: checkYear
                                  });
                                  // break;
                                } else if (i === 0 && statusData.status === 'a_vencer') {
                                  // Se for o mês atual e estiver a vencer em breve
                                  let diff = -1;
                                  if (contract.billingMode === 'Mensal' || !contract.billingMode) {
                                    diff = (contract.paymentDay || 5) - now.getDate();
                                  } else {
                                    // Para por sessÉo, ver a sessÉo mais próxima de vencer
                                    const monthEvents = events.filter(e => {
                                      const ed = parseLocalDate(e.date);
                                      return ed && ed.getMonth() === m && ed.getFullYear() === y &&
                                        e.patient === p.name && (e.status === 'confirmed' || e.status === 'unexcused_absence');
                                    });
                                    if (monthEvents.length > 0) {
                                      const lastSessionDisp = parseLocalDate(monthEvents[monthEvents.length - 1].date);
                                      const dueDate = new Date(lastSessionDisp);
                                      dueDate.setDate(dueDate.getDate() + (contract.dueDaysAfterSession || 2));
                                      diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    }
                                  }

                                  if (diff >= 0 && diff <= 10) {
                                    alerts.push({
                                      type: 'vencendo',
                                      patient: p,
                                      contract: contract,
                                      label: diff === 0 ? 'Vence HOJE' : `Vence em ${diff} dias`,
                                      month: m,
                                      year: y
                                    });
                                  }
                                }
                              }
                            });

                            // Ordenar alertas: Mais antigos primeiro, seguidos pelos que vencem hoje/breve
                            alerts.sort((a, b) => {
                              const dateA = new Date(a.year, a.month, a.type === 'atrasado' ? 1 : (a.contract.paymentDay || 31));
                              const dateB = new Date(b.year, b.month, b.type === 'atrasado' ? 1 : (b.contract.paymentDay || 31));
                              return dateA - dateB;
                            });

                            return (
                              <>
                                {alerts.length > 0 ? (
                                  <>
                                    {alerts.slice(0, 5).map((alert, i) => (
                                      <div key={i} className="appointment-item" style={{ borderLeft: alert.type === 'atrasado' ? '4px solid #f43f5e' : '4px solid #f59e0b', paddingLeft: '12px', marginBottom: '8px' }}>
                                        <div className="patient-info">
                                          <strong>{alert.patient.name}</strong>
                                          <span style={{ fontSize: '0.8rem', color: alert.type === 'atrasado' ? '#f43f5e' : 'var(--text-muted)' }}>{alert.label}</span>
                                        </div>
                                        <div style={{ fontWeight: '600', marginRight: '10px', fontSize: '1rem' }}>{formatBRL(calculateMonthlyValue(alert.contract))}</div>
                                        <button className="btn-action" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => {
                                          setSelectedFinancePatient(alert.patient);
                                          setShowFinanceDetail(true);
                                        }}>Ajustar</button>
                                      </div>
                                    ))}
                                    {alerts.length > 5 && (
                                      <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 15px' }} onClick={() => setShowAllAlertsModal(true)}>
                                          {alerts.length - 5} alertas ocultos. Ver Todos
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Tudo em dia por aqui! ✨</p>}

                                {showAllAlertsModal && (
                                  <div className="modal-overlay" onClick={() => setShowAllAlertsModal(false)}>
                                    <div className="modal-content wide animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', width: '90%', maxWidth: '600px' }}>
                                      <div className="modal-header">
                                        <h2>Todos os Alertas</h2>
                                        <button className="btn-icon" onClick={() => setShowAllAlertsModal(false)}><X size={20} /></button>
                                      </div>
                                      <div className="modal-body" style={{ overflowY: 'auto', padding: '15px' }}>
                                        <div className="appointment-list">
                                          {alerts.map((alert, i) => (
                                            <div key={i} className="appointment-item" style={{ borderLeft: alert.type === 'atrasado' ? '4px solid #f43f5e' : '4px solid #f59e0b', paddingLeft: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <div className="patient-info">
                                                <strong>{alert.patient.name}</strong>
                                                <br />
                                                <span style={{ fontSize: '0.8rem', color: alert.type === 'atrasado' ? '#f43f5e' : 'var(--text-muted)' }}>{alert.label}</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatBRL(calculateMonthlyValue(alert.contract))}</div>
                                                <button className="btn-action" onClick={() => {
                                                  setSelectedFinancePatient(alert.patient);
                                                  setShowFinanceDetail(true);
                                                  setShowAllAlertsModal(false);
                                                }}>Ajustar</button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
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
                      <h1>GestÉo de Pacientes</h1>
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
                          <th>Última sessÉo</th>
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
                              <div style={{ position: 'relative' }}>
                                <button
                                  className="btn-icon-table"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePatientMenuId(activePatientMenuId === p.id ? null : p.id);
                                  }}
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {activePatientMenuId === p.id && (
                                  <div className="dropdown-menu" style={{
                                    position: 'absolute',
                                    right: '0',
                                    top: '100%',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 100,
                                    minWidth: '150px',
                                    overflow: 'hidden'
                                  }}>
                                    <button
                                      className="dropdown-item"
                                      style={{ width: '100%', padding: '10px 15px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      onClick={(e) => { e.stopPropagation(); setSelectedPatientForDetail(p); setActivePatientMenuId(null); }}
                                    >
                                      <ChevronRight size={14} /> Detalhes
                                    </button>
                                    <button
                                      className="dropdown-item"
                                      style={{ width: '100%', padding: '10px 15px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      onClick={(e) => { e.stopPropagation(); handleEditPatient(p); setActivePatientMenuId(null); }}
                                    >
                                      <Edit3 size={14} /> Editar
                                    </button>
                                    <button
                                      className="dropdown-item"
                                      style={{ width: '100%', padding: '10px 15px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', color: '#f43f5e', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      onClick={(e) => { e.stopPropagation(); handleDeletePatient(p.id); }}
                                    >
                                      <Trash2 size={14} /> Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="patient-detail-overlay animate-fade-in" onClick={() => setSelectedPatientForDetail(null)}>
                  <div className="patient-detail-sidebar" onClick={(e) => e.stopPropagation()}>
                    <div className="detail-header">
                      <button className="btn-close" onClick={() => setSelectedPatientForDetail(null)}>
                        <ChevronRight size={24} />
                      </button>
                      <h2>{selectedPatientForDetail.name}</h2>
                      <span className="patient-status-badge active">Em tratamento</span>
                    </div>

                    <div className="detail-tabs" style={{ display: 'flex', gap: '15px', padding: '0 20px', marginBottom: '25px' }}>
                      <button
                        className={`tab-pill`}
                        onClick={() => setPatientDetailTab('overview')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: patientDetailTab === 'overview' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                          background: patientDetailTab === 'overview' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)',
                          color: patientDetailTab === 'overview' ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <User size={18} /> VisÉo Geral
                      </button>
                      <button
                        className={`tab-pill`}
                        onClick={() => setPatientDetailTab('sessions')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: patientDetailTab === 'sessions' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                          background: patientDetailTab === 'sessions' ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)',
                          color: patientDetailTab === 'sessions' ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <Calendar size={18} /> Sessões
                      </button>
                      <button
                        className={`tab-pill`}
                        onClick={() => {
                          setSelectedFinancePatient(selectedPatientForDetail);
                          setShowFinanceDetail(true);
                          setSelectedPatientForDetail(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <DollarSign size={18} /> Financeiro
                      </button>
                    </div>

                    <div className="detail-content custom-scrollbar">
                      {patientDetailTab === 'overview' && (
                        <div className="animate-slide-in">
                          <div className="info-card">
                            <h3>Informações Pessoais</h3>
                            <div className="info-row">
                              <span className="label">Telefone:</span>
                              <span className="value">{selectedPatientForDetail.phone}</span>
                            </div>
                            <div className="info-row">
                              <span className="label">Email:</span>
                              <span className="value">{selectedPatientForDetail.email}</span>
                            </div>
                            <div className="info-row">
                              <span className="label">Endereço:</span>
                              <span className="value">{selectedPatientForDetail.address}</span>
                            </div>
                          </div>

                          <div className="info-card" style={{ marginTop: '20px' }}>
                            <h3>Contrato Terapêutico</h3>
                            <div className="info-row">
                              <span className="label">Faturamento:</span>
                              <span className="value">
                                {selectedPatientForDetail.billingMode === 'Por sessÉo'
                                  ? `${selectedPatientForDetail.dueDaysAfterSession} dias após sessÉo`
                                  : `Mensal (Dia ${selectedPatientForDetail.paymentDay || 5})`}
                              </span>
                            </div>
                            <div className="info-row">
                              <span className="label">Valor sessÉo:</span>
                              <span className="value">{formatBRL(selectedPatientForDetail.sessionValue)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {patientDetailTab === 'sessions' && (
                        <div className="sessions-list animate-slide-in">
                          <h3>Histórico de Sessões</h3>
                          {events
                            .filter(e => e.patient === selectedPatientForDetail.name)
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map(session => (
                              <div key={session.id} className="session-history-item" style={{ padding: '15px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>{formatLocalDate(session.date)}</div>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{session.type} € {session.status === 'confirmed' ? 'Realizada' : 'Pendente'}</div>
                                </div>
                                <button
                                  className="btn-outline-small"
                                  onClick={() => handleNavigateToRecord(session)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                  <FileText size={14} />
                                  Prontuário
                                </button>
                              </div>
                            ))}
                          {events.filter(e => e.patient === selectedPatientForDetail.name).length === 0 && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>Nenhuma sessÉo registrada.</p>
                          )}
                        </div>
                      )}
                    </div>
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
                  Nova sessÉo
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
                                    <span className="event-patient-name">
                                      - {event.patient.split(' ')[0]}
                                      {(() => {
                                        const p = patients.find(patient => patient.name === event.patient);
                                        const c = contracts.find(contract => contract.patientId === p?.id);
                                        if (c?.billingMode === 'Mensal Antecipado' && (p?.credits || 0) <= 0) {
                                          return <span title="Sem créditos" style={{ color: '#f43f5e', fontSize: '0.8rem', marginLeft: '2px' }}>🔴</span>;
                                        }
                                        return null;
                                      })()}
                                    </span>
                                  </div>
                                  <div className="event-actions-quick" style={{ display: 'flex', gap: '4px', marginTop: '4px', position: 'relative' }}>
                                    <button title="Confirmar" className="action-dot-btn confirm" onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'confirmed'); }}><Check size={10} /></button>
                                    <button title="Pendente" className="action-dot-btn" onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'pending'); }}><X size={10} /></button>
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        title="Falta"
                                        className={`action-dot-btn ${(event.status === 'excused_absence' || event.status === 'unexcused_absence') ? 'excused' : ''}`}
                                        style={{ fontSize: '8px', width: '32px', background: (event.status === 'excused_absence' || event.status === 'unexcused_absence') ? '#f59e0b20' : 'var(--bg-secondary)', color: '#f59e0b', padding: '0' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowFaltaMenuId(showFaltaMenuId === event.id ? null : event.id);
                                        }}
                                      >
                                        FALTA
                                      </button>
                                      {showFaltaMenuId === event.id && (
                                        <div
                                          className="dropdown-menu animate-pop-in"
                                          style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '0',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            zIndex: 100,
                                            minWidth: '100px',
                                            marginBottom: '5px'
                                          }}
                                        >
                                          <button
                                            className="dropdown-item"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '0.7rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                                            onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'excused_absence'); setShowFaltaMenuId(null); }}
                                          >
                                            Justificada
                                          </button>
                                          <button
                                            className="dropdown-item"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: '0.7rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', borderTop: '1px solid var(--border-light)' }}
                                            onClick={(e) => { e.stopPropagation(); updateEventStatus(event.id, 'unexcused_absence'); setShowFaltaMenuId(null); }}
                                          >
                                            NÉo Justificada
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <button title="Excluir Agendamento" className="action-dot-btn" style={{ color: '#f43f5e' }} onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}><Trash2 size={10} /></button>
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
                  <div className="legend-item">
                    <div style={{ color: '#f43f5e', fontSize: '1.2rem', lineHeight: '0.8rem' }}>🔴</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem créditos</span>
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
                      const monthDisplay = parseLocalDate(event.date).toLocaleDateString('pt-BR', { month: 'short' });

                      return (
                        <div key={event.id} className="session-item">
                          <div className="session-date">
                            <span className="date-day">{dayDisplay}</span>
                            <span className="date-month">{monthDisplay}</span>
                          </div>
                          <div className="session-details">
                            <strong>{event.patient}</strong>
                            <span>{event.time} € {event.type}</span>
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
                <p>Selecione uma sessÉo, transcreva o áudio e use sua IA preferida para analisar.</p>
              </div>

              <div className="records-grid">

                {/* Coluna da Esquerda: SeleçÉo e TranscriçÉo */}
                <div className="card-premium session-input" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <div className="card-header">
                    <h3>1. Selecione a sessÉo</h3>
                  </div>

                  <div className="filters-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>Filtrar por Paciente</label>
                      <select
                        className="form-input"
                        value={recordFilterPatient}
                        onChange={(e) => setRecordFilterPatient(e.target.value)}
                        style={{ fontSize: '0.9rem', padding: '8px' }}
                      >
                        <option value="">Todos</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>Filtrar por Data</label>
                      <input
                        type="date"
                        className="form-input"
                        value={recordFilterDate}
                        onChange={(e) => setRecordFilterDate(e.target.value)}
                        style={{ fontSize: '0.9rem', padding: '8px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <select
                      className="form-input"
                      value={selectedRecordEventId}
                      onChange={(e) => setSelectedRecordEventId(e.target.value)}
                      style={{ fontSize: '1rem', padding: '12px' }}
                    >
                      <option value="">-- Escolha um atendimento --</option>
                      {events
                        .filter(e => {
                          // Aplica filtros
                          if (recordFilterPatient && e.patient !== recordFilterPatient) return false;
                          if (recordFilterDate && e.date !== recordFilterDate) return false;
                          return true;
                        })
                        .sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time))
                        .map(e => (
                          <option key={e.id} value={e.id}>
                            {formatLocalDate(e.date)} É s {e.time} - {e.patient} ({e.type})
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedRecordEventId && (
                    <div className="transcription-area animate-fade-in" style={{ marginTop: '20px' }}>
                      <div className="card-header">
                        <h3>2. TranscriçÉo de Voz</h3>
                        {isRecordingReal && <span className="recording-badge pulse">Gravando...</span>}
                      </div>

                      <div className="recording-controls" style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                        <button
                          className={`btn-record ${isRecordingReal ? 'active' : ''}`}
                          onClick={toggleRecording}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}
                        >
                          {isRecordingReal ? <MicOff size={20} /> : <Mic size={20} />}
                          {isRecordingReal ? 'Parar GravaçÉo' : 'Começar GravaçÉo'}
                        </button>
                      </div>

                      <textarea
                        className="form-input"
                        style={{ minHeight: '300px', lineHeight: '1.6', resize: 'vertical' }}
                        placeholder="O texto transcrito aparecerá aqui. Você também pode digitar manualmente."
                        value={recordData.transcription}
                        onChange={(e) => setRecordData({ ...recordData, transcription: e.target.value })}
                      ></textarea>
                      <p className="hint" style={{ marginTop: '5px' }}>O áudio é transformado em texto em tempo real e nÉo é salvo, economizando espaço.</p>
                    </div>
                  )}
                </div>

                {/* Coluna da Direita: IA e Análise */}
                {selectedRecordEventId ? (
                  <div className="card-premium ai-output animate-slide-in">
                    <div className="card-header">
                      <h3><Sparkles size={18} className="icon-sparkle" /> 3. Análise com IA (Manual)</h3>
                      <button className="btn-primary" onClick={handleSaveRecord}>
                        <Save size={18} style={{ marginRight: '8px' }} />
                        Salvar Prontuário
                      </button>
                    </div>

                    <div className="ai-workflow" style={{ marginTop: '20px' }}>

                      <div className="step-box" style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong>Instruções para a IA (Prompt)</strong>
                          <button className="btn-link" style={{ fontSize: '0.8rem' }} onClick={() => setRecordData(prev => ({ ...prev, aiPrompt: 'Sou psicóloga analista do comportamento...' }))}>Restaurar PadrÉo</button>
                        </label>
                        <textarea
                          className="form-input"
                          style={{ height: '120px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                          value={recordData.aiPrompt}
                          onChange={(e) => setRecordData({ ...recordData, aiPrompt: e.target.value })}
                        ></textarea>
                      </div>

                      <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                        <button
                          className="btn-outline"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={() => copyToClipboard(`${recordData.aiPrompt}\n\n---\n\nTexto para analisar:\n${recordData.transcription}`)}
                        >
                          <Copy size={16} style={{ marginRight: '8px' }} />
                          Copiar TUDO (Prompt + Texto)
                        </button>
                        <a
                          href="https://chat.openai.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '0 20px' }}
                        >
                          Abrir ChatGPT †—
                        </a>
                      </div>

                      <div className="step-box">
                        <label style={{ display: 'block', marginBottom: '8px' }}><strong>Cole aqui a Análise da IA</strong></label>
                        <textarea
                          className="form-input"
                          style={{ minHeight: '400px', background: '#f8fafc', borderStyle: 'dashed' }}
                          placeholder="Copie a resposta do ChatGPT e cole aqui para salvar no prontuário..."
                          value={recordData.aiAnalysis}
                          onChange={(e) => setRecordData({ ...recordData, aiAnalysis: e.target.value })}
                        ></textarea>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="card-premium empty-state-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                    <h3>Selecione uma sessÉo ao lado</h3>
                    <p>Para começar a transcrever e analisar.</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="finance-view animate-fade-in">
              <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1>Financeiro & Recebimentos</h1>
                  <p>Monitore seu faturamento real e previsões de recebimento.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    className="form-input"
                    style={{ width: '130px' }}
                    value={financeFilterMonth}
                    onChange={(e) => setFinanceFilterMonth(Number(e.target.value))}
                  >
                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="form-input"
                    style={{ width: '100px' }}
                    value={financeFilterYear}
                    onChange={(e) => setFinanceFilterYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const m = financeFilterMonth;
                const y = financeFilterYear;

                let totalPago = 0;
                let totalAVencer = 0;
                let totalAtrasado = 0;
                let totalImposto = 0;
                let totalNFs = 0;
                let totalInadimplenteAno = 0;
                const inadimplenteClients = new Set();

                patients.forEach(p => {
                  const contract = contracts.find(c => c.patientId === p.id);
                  const monthlyValue = contract ? calculateMonthlyValue(contract, m, y) : 0;
                  const status = getPaymentData(p.id, m, y, contract, paymentStatuses, events).status;

                  if (status === 'pago') {
                    totalPago += monthlyValue;
                    if (contract?.requiresNF) {
                      totalImposto += monthlyValue * 0.06;
                      totalNFs++;
                    }
                  } else if (status === 'a_vencer') {
                    totalAVencer += monthlyValue;
                  } else if (status === 'atrasado') {
                    totalAtrasado += monthlyValue;
                  }
                });

                // Cálculo de Inadimplência do Ano
                Object.keys(paymentStatuses).forEach(key => {
                  const [pId, month, year] = key.split('-');
                  const entry = paymentStatuses[key];
                  const status = typeof entry === 'object' ? entry.status : entry;

                  if (Number(year) === y && status === 'inadimplente') {
                    const contract = contracts.find(c => c.patientId === Number(pId));
                    if (contract) {
                      totalInadimplenteAno += calculateMonthlyValue(contract, Number(month), Number(year));
                      inadimplenteClients.add(pId);
                    }
                  }
                });

                return (
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="card-premium" style={{ borderLeft: '4px solid #10b981' }}>
                      <span className="card-label">Total Recebido (Mês)</span>
                      <div className="card-value">{formatBRL(totalPago)}</div>
                      <span className="card-trend positive">Valor em caixa</span>
                    </div>
                    <div className="card-premium" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <span className="card-label">A Receber (Previsto)</span>
                      <div className="card-value">{formatBRL(totalAVencer + totalAtrasado)}</div>
                      <span className="card-trend" style={{ fontSize: '0.75rem' }}>
                        {formatBRL(totalAVencer)} a vencer | {formatBRL(totalAtrasado)} atrasados
                      </span>
                    </div>
                    <div className="card-premium" style={{ borderLeft: '4px solid var(--primary)' }}>
                      <span className="card-label">Imposto & NF (Mês)</span>
                      <div className="card-value">{formatBRL(totalImposto)}</div>
                      <span className="card-trend">{totalNFs} Notas Fiscais a emitir</span>
                    </div>
                    <div className="card-premium" style={{ borderLeft: '4px solid #f43f5e' }}>
                      <span className="card-label">Inadimplência (Ano)</span>
                      <div className="card-value">{formatBRL(totalInadimplenteAno)}</div>
                      <span className="card-trend" style={{ color: '#f43f5e' }}>{inadimplenteClients.size} clientes inadimplentes</span>
                    </div>
                  </div>
                );
              })()}

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
                              <span>{formatBRL(patient.sessionValue)} / sessÉo</span>
                            </div>
                          </div>
                          <div className="card-finance-body">
                            <div className="finance-stat">
                              <label>Este Mês (Sessões)</label>
                              <div className="value">{getSessionsCount(patient.name)} sessões</div>
                            </div>
                            <div className="finance-stat">
                              <label>Total a Receber</label>
                              <div className="value primary-color">{formatBRL(monthlyValue)}</div>
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
                      <h3>“… Notas a Emitir (Este Mês)</h3>
                    </div>
                    <div className="nf-list">
                      {contracts.filter(c => c.requiresNF).map(c => (
                        <div key={c.id} className="nf-item">
                          <div className="nf-info">
                            <strong>{c.patientName}</strong>
                            <span>Vencimento: Dia {c.paymentDay}</span>
                          </div>
                          <div className="nf-value">{formatBRL(calculateMonthlyValue(c))}</div>
                          <button className="btn-action" onClick={() => handleSendNFEmail(c)}>Emitir NF</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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

          {activeTab === 'data_management' && (
            <div className="data-management-view animate-fade-in">
              <div className="view-header">
                <h1>GestÉo de Dados</h1>
                <p>Exporte e importe seus dados para manter sua clínica segura.</p>
              </div>

              <div className="card-premium" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
                <Database size={64} style={{ color: 'var(--primary)', marginBottom: '20px', opacity: '0.8' }} />
                <h2 style={{ marginBottom: '10px' }}>Backup e Segurança</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
                  Salve uma cópia de segurança de todos os seus pacientes, prontuários e financeiro.
                  Você pode usar este arquivo para restaurar seus dados em outro computador.
                </p>

                <div className="backup-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>

                  {/* Card Exportar */}
                  <div className="action-card" style={{
                    padding: '30px',
                    borderRadius: '16px',
                    border: '2px dashed var(--border-light)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                    onClick={handleExportData}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  >
                    <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                      <Download size={32} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Exportar Dados</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Baixar arquivo .json atual</p>
                  </div>

                  {/* Card Importar */}
                  <label className="action-card" style={{
                    padding: '30px',
                    borderRadius: '16px',
                    border: '2px dashed var(--border-light)',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'block'
                  }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  >
                    <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                      <Upload size={32} style={{ color: 'var(--primary)' }} />
                    </div>
                    <h3 style={{ marginBottom: '8px' }}>Importar Dados</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Restaurar de um arquivo</p>
                    <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                  </label>

                </div>

                {lastBackupDate && !isNaN(new Date(lastBackupDate).getTime()) && (
                  <div style={{ marginTop: '40px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', display: 'inline-block' }}>
                    <CheckCircle2 size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Éšltimo backup realizado em <strong>{new Date(lastBackupDate).toLocaleDateString('pt-BR')} É s {new Date(lastBackupDate).toLocaleTimeString('pt-BR')}</strong>
                  </div>
                )}
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


            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova sessÉo */}
      {showNewSessionModal && (
        <div className="modal-overlay" onClick={() => setShowNewSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova sessÉo</h2>
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
                  <option value="AvaliaçÉo">AvaliaçÉo</option>
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
                Agendar sessÉo
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
                <label>Valor por sessÉo (R$)</label>
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
                <span className="patient-meta" style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  <span><Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {contracts.find(c => c.patientId === selectedFinancePatient.id)?.billingMode || 'Mensal'}</span>
                  <span><DollarSign size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> {formatBRL(selectedFinancePatient.sessionValue)} / sessÉo</span>
                </span>
              </div>
              <button className="btn-close" onClick={() => setShowFinanceDetail(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body custom-scrollbar">

              <div className="finance-summary-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                {contracts.find(c => c.patientId === selectedFinancePatient.id)?.billingMode === 'Mensal Antecipado' ? (
                  <div className="card-premium" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
                    <span style={{ fontSize: '0.85rem', opacity: 0.9, display: 'block', marginBottom: '5px' }}>Saldo de Créditos</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                      {selectedFinancePatient.credits || 0} sessões
                    </div>
                  </div>
                ) : (
                  <div className="card-premium" style={{ background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--primary-rgb), 0.05) 100%)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Engajamento (Lifetime)</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {events.filter(e => e.patient === selectedFinancePatient.name && (e.status === 'confirmed' || e.status === 'unexcused_absence')).length} sessões
                    </div>
                  </div>
                )}
                <div className="card-premium">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Total Investido</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {formatBRL(events.filter(e => e.patient === selectedFinancePatient.name && (e.status === 'confirmed' || e.status === 'unexcused_absence')).length * selectedFinancePatient.sessionValue)}
                  </div>
                </div>
              </div>

              <div className="finance-tabs" style={{ marginBottom: '20px' }}>
                <div className="finance-tab active" style={{ borderBottom: '2px solid var(--primary)', paddingBottom: '10px', fontWeight: '600' }}>Histórico de Pagamentos</div>
              </div>

              <div className="session-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const months = [];
                  const now = new Date();
                  const contract = contracts.find(c => c.patientId === selectedFinancePatient.id);

                  for (let i = 0; i < 12; i++) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                    const monthEvents = events.filter(e => {
                      const eDate = parseLocalDate(e.date);
                      return eDate && eDate.getMonth() === d.getMonth() &&
                        eDate.getFullYear() === d.getFullYear() &&
                        e.patient === selectedFinancePatient.name &&
                        (e.status === 'confirmed' || e.status === 'unexcused_absence');
                    });

                    if (monthEvents.length > 0) {
                      const pData = getPaymentData(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), contract, paymentStatuses, events);
                      const status = pData.status;
                      const displayValue = calculateMonthlyValue(contract, d.getMonth(), d.getFullYear());

                      let statusBadge = null;
                      if (status === 'pago') statusBadge = <span className="status-badge active" style={{ background: '#10b981', color: 'white' }}>Pago</span>;
                      else if (status === 'inadimplente') statusBadge = <span className="status-badge" style={{ background: '#f43f5e', color: 'white' }}>Inadimplente</span>;
                      else if (status === 'atrasado') statusBadge = <span className="status-badge" style={{ background: '#f43f5e', color: 'white' }}>Em Atraso</span>;
                      else statusBadge = <span className="status-badge" style={{ background: '#f59e0b', color: 'white' }}>A Vencer</span>;

                      months.push(
                        <div key={monthName} className="history-month-item" style={{
                          padding: '15px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          borderLeft: `4px solid ${status === 'pago' ? '#10b981' : (status === 'atrasado' || status === 'inadimplente' ? '#f43f5e' : '#f59e0b')}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                            <div className="month-info" style={{ flex: 1 }}>
                              <strong style={{ textTransform: 'capitalize', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>{monthName}</strong>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{monthEvents.length} sessões realizadas</span>
                            </div>
                            <div className="month-total" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                <span>R$</span>
                                <input
                                  type="number"
                                  value={displayValue}
                                  onChange={(e) => handleUpdatePaymentStatus(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), null, e.target.value)}
                                  style={{
                                    width: '80px',
                                    border: 'none',
                                    background: 'rgba(0,0,0,0.05)',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    textAlign: 'right',
                                    color: 'inherit'
                                  }}
                                />
                              </div>
                              {statusBadge}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '5px' }}>
                            {contract?.billingMode === 'Mensal Antecipado' ? (
                              <div style={{ width: '100%' }}>
                                <button className="btn-outline-small" style={{ width: '100%', fontSize: '0.75rem', padding: '8px', background: 'rgba(var(--primary-rgb), 0.1)', borderColor: 'var(--primary)', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => {
                                  const sessionVal = selectedFinancePatient.sessionValue || 200;
                                  setCreditForm({
                                    amount: sessionVal * 4,
                                    credits: 4,
                                    date: new Date().toISOString().split('T')[0]
                                  });
                                  setCreditTarget({ patient: selectedFinancePatient, month: d.getMonth(), year: d.getFullYear() });
                                  setShowCreditModal(true);
                                }}>
                                  <Plus size={14} /> Nova Entrada (Créditos)
                                </button>

                                {paymentStatuses[`${selectedFinancePatient.id}-${d.getMonth()}-${d.getFullYear()}`]?.transactions?.length > 0 && (
                                  <div className="romaneios-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {paymentStatuses[`${selectedFinancePatient.id}-${d.getMonth()}-${d.getFullYear()}`].transactions.map(t => (
                                      <div key={t.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
                                        <span>{new Date(t.date).toLocaleDateString('pt-BR')} - {formatBRL(t.amount)} ({t.credits} cr.)</span>
                                        <button onClick={() => { if (window.confirm("Cancelar este romaneio e estornar créditos?")) handleCancelTransaction(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), t.id) }} style={{ border: 'none', background: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}>
                                          <Trash size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <button className="btn-outline-small" style={{ fontSize: '0.7rem', padding: '5px 10px' }} onClick={() => handleUpdatePaymentStatus(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), 'pago')}>Me pagou</button>
                                <button className="btn-outline-small" style={{ fontSize: '0.7rem', padding: '5px 10px' }} onClick={() => handleUpdatePaymentStatus(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), 'inadimplente')}>Inadimplente</button>
                              </>
                            )}
                            <button className="btn-outline-small" style={{ fontSize: '0.7rem', padding: '5px 10px', opacity: 0.6 }} onClick={() => handleUpdatePaymentStatus(selectedFinancePatient.id, d.getMonth(), d.getFullYear(), 'pendente')}>Resetar</button>
                          </div>
                        </div>
                      );
                    }
                  }
                  return months.length > 0 ? months : <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Nenhum histórico financeiro encontrado.</div>;
                })()}
              </div>

              <div className="detail-actions" style={{ marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                <button className="btn-primary" onClick={() => handleSendNFEmail(contracts.find(c => c.patientId === selectedFinancePatient.id))} style={{ width: '100%', justifyContent: 'center' }}>
                  <FileText size={18} style={{ marginRight: '8px' }} /> Enviar Dados p/ Contabilidade (NF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Novo Paciente */}
      {
        showAddPatientModal && (
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
                    <label>Valor por sessÉo (R$)</label>
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
                    <label>Frequência de Pagamento</label>
                    <select
                      value={newPatient.billingMode}
                      onChange={(e) => setNewPatient({ ...newPatient, billingMode: e.target.value })}
                      className="form-input"
                    >
                      <option value="Mensal">Mensal (Pós-pago)</option>
                      <option value="Mensal Antecipado">Mensal Antecipado (Créditos)</option>
                      <option value="Por sessÉo">Por sessÉo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    {newPatient.billingMode === 'Mensal' ? (
                      <>
                        <label>Dia do Vencimento</label>
                        <input
                          type="number"
                          placeholder="Dia do mês (ex: 10)"
                          value={newPatient.paymentDay}
                          onChange={(e) => setNewPatient({ ...newPatient, paymentDay: Number(e.target.value) })}
                          className="form-input"
                          min="1"
                          max="31"
                        />
                      </>
                    ) : newPatient.billingMode === 'Por sessÉo' ? (
                      <>
                        <label>Dias p/ Vencer (após sessÉo)</label>
                        <input
                          type="number"
                          placeholder="Qtd de dias (ex: 2)"
                          value={newPatient.dueDaysAfterSession}
                          onChange={(e) => setNewPatient({ ...newPatient, dueDaysAfterSession: Number(e.target.value) })}
                          className="form-input"
                        />
                      </>
                    ) : null}
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
        )
      }
      {/* Modal de ConfirmaçÉo de ExclusÉo de Paciente */}
      {showDeletePatientModal && patientToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeletePatientModal(false)}>
          <div className="modal-content animate-pop-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: '30px' }}>
            <div style={{ color: '#f43f5e', marginBottom: '20px' }}>
              <AlertTriangle size={64} strokeWidth={1.5} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ marginBottom: '15px' }}>Excluir Paciente?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: '1.6' }}>
              Tem certeza que deseja excluir <strong>{patientToDelete.name}</strong>?<br />
              Esta açÉo é <strong>irreversível</strong> e apagará permanentemente todos os contratos, sessões e históricos financeiros vinculados.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button className="btn-secondary" onClick={() => setShowDeletePatientModal(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{ background: '#f43f5e', borderColor: '#f43f5e' }}
                onClick={confirmDeletePatient}
              >
                Sim, Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Entrada de Créditos */}
      {showCreditModal && creditTarget.patient && (
        <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
          <div className="modal-content animate-pop-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Entrada de Créditos</h2>
              <button className="btn-close" onClick={() => setShowCreditModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Registrando pagamento para <strong>{creditTarget.patient.name}</strong>.
              </p>

              <div className="form-group">
                <label>Valor Recebido (R$)</label>
                <input
                  type="number"
                  className="form-input"
                  value={creditForm.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const sessionVal = creditTarget.patient.sessionValue || 200;
                    setCreditForm({ ...creditForm, amount: val, credits: Math.floor(val / sessionVal) });
                  }}
                />
              </div>

              <div className="form-group">
                <label>Quantidade de Créditos (Sessões)</label>
                <input
                  type="number"
                  className="form-input"
                  value={creditForm.credits}
                  onChange={(e) => setCreditForm({ ...creditForm, credits: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Data do Pagamento</label>
                <input
                  type="date"
                  className="form-input"
                  value={creditForm.date}
                  onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })}
                />
              </div>

              <button className="btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={handleAddCredit}>
                Confirmar e Gerar Créditos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

