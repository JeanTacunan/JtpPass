/* 
 * Registro de Pasajes V2
 * Desarrollado por Ing. Jean Pool Tacunan Palomino
 * Lógica Principal de la Aplicación (State, CRUD, Audio API, Exports, Modals)
 */

// --- GLOBAL STATE ---
const state = {
  records: [],
  tariffs: [1.00, 1.50, 2.00, 2.50],
  activeTab: 'registro',
  theme: 'dark',
  soundsEnabled: true,
  firebaseConfig: { apiKey: '', dbUrl: '' },
  currentEditId: null,
  currentDeleteId: null
};

// --- AUDIO SINTETIZADOR (Web Audio API) ---
const SoundEffects = {
  audioCtx: null,

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  play(type) {
    if (!state.soundsEnabled) return;
    try {
      this.init();
      // Resume context if suspended (browser security)
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'click') {
        // Soft tactile tap sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        // High quality premium fintech chime (two rapid upward sine notes)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'delete' || type === 'warning') {
        // Soft low alert sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now); // A2
        osc.frequency.linearRampToValueAtTime(70, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn('AudioContext no soportado o bloqueado por el navegador.', e);
    }
  }
};

// --- DOM ELEMENTS ---
const DOM = {
  themeToggle: document.getElementById('themeToggle'),
  soundToggle: document.getElementById('soundToggle'),
  navItems: document.querySelectorAll('.nav-item'),
  panels: document.querySelectorAll('.panel'),
  selectedAmount: document.getElementById('selectedAmount'),
  quickTariffBtns: document.querySelectorAll('.btn-quick'),
  customAmount: document.getElementById('customAmount'),
  paymentBtns: document.querySelectorAll('.btn-payment'),
  recordObservation: document.getElementById('recordObservation'),
  btnRegistrar: document.getElementById('btnRegistrar'),
  
  // Historial Elements
  historyListContainer: document.getElementById('historyListContainer'),
  searchHistory: document.getElementById('searchHistory'),
  filterDate: document.getElementById('filterDate'),
  sortOrder: document.getElementById('sortOrder'),
  filterPills: document.querySelectorAll('.pill'),
  
  // Modals
  modalEditar: document.getElementById('modalEditar'),
  editRecordId: document.getElementById('editRecordId'),
  editRecordAmount: document.getElementById('editRecordAmount'),
  editRecordMethod: document.getElementById('editRecordMethod'),
  editRecordDate: document.getElementById('editRecordDate'),
  editRecordTime: document.getElementById('editRecordTime'),
  editRecordObservation: document.getElementById('editRecordObservation'),
  btnCloseEditModal: document.getElementById('btnCloseEditModal'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),
  btnSaveEdit: document.getElementById('btnSaveEdit'),
  
  modalConfirmarEliminar: document.getElementById('modalConfirmarEliminar'),
  deleteRecordId: document.getElementById('deleteRecordId'),
  btnCancelDelete: document.getElementById('btnCancelDelete'),
  btnConfirmDelete: document.getElementById('btnConfirmDelete'),

  modalConfirmarVaciado: document.getElementById('modalConfirmarVaciado'),
  btnCancelPurge: document.getElementById('btnCancelPurge'),
  btnConfirmPurge: document.getElementById('btnConfirmPurge'),
  
  // Settings Inputs
  quickTariffs: [
    document.getElementById('quickTariff0'),
    document.getElementById('quickTariff1'),
    document.getElementById('quickTariff2'),
    document.getElementById('quickTariff3')
  ],
  btnBackupExport: document.getElementById('btnBackupExport'),
  backupFileImport: document.getElementById('backupFileImport'),
  btnDatabasePurge: document.getElementById('btnDatabasePurge'),
  firebaseApiKey: document.getElementById('firebaseApiKey'),
  firebaseDbUrl: document.getElementById('firebaseDbUrl'),
  btnSaveFirebase: document.getElementById('btnSaveFirebase'),
  
  // Exports
  btnExportExcel: document.getElementById('btnExportExcel'),
  btnExportPDF: document.getElementById('btnExportPDF')
};

// --- INITIALIZE APPLICATION ---
function initApp() {
  loadData();
  setupEventListeners();
  applyTheme();
  applySoundsIndicator();
  updateTariffUI();
  renderHistory();
  if (window.updateDashboard) {
    window.updateDashboard();
  }
}

// --- STATE STORAGE MANAGEMENT ---
function loadData() {
  // Load Theme
  state.theme = localStorage.getItem('pasajes_v2_theme') || 'dark';
  
  // Load Sounds Switch
  const savedSounds = localStorage.getItem('pasajes_v2_sounds');
  state.soundsEnabled = savedSounds !== null ? JSON.parse(savedSounds) : true;
  
  // Load Tariffs
  const savedTariffs = localStorage.getItem('pasajes_v2_tariffs');
  if (savedTariffs) {
    state.tariffs = JSON.parse(savedTariffs);
  }
  
  // Load Records
  const savedRecords = localStorage.getItem('pasajes_v2_records');
  if (savedRecords) {
    state.records = JSON.parse(savedRecords);
  }

  // Load Firebase Config
  const savedFirebase = localStorage.getItem('pasajes_v2_firebase');
  if (savedFirebase) {
    state.firebaseConfig = JSON.parse(savedFirebase);
  }
}

function saveData() {
  localStorage.setItem('pasajes_v2_records', JSON.stringify(state.records));
  localStorage.setItem('pasajes_v2_tariffs', JSON.stringify(state.tariffs));
  localStorage.setItem('pasajes_v2_theme', state.theme);
  localStorage.setItem('pasajes_v2_sounds', JSON.stringify(state.soundsEnabled));
  localStorage.setItem('pasajes_v2_firebase', JSON.stringify(state.firebaseConfig));
  
  // Update external Sync if Firebase is configured
  syncToFirebase();
}

// --- CORE CRUD OPERATIONS ---

// Add Record
function addRecord() {
  const amount = parseFloat(DOM.selectedAmount.textContent);
  if (isNaN(amount) || amount <= 0) {
    alert('Por favor seleccione o ingrese un monto válido.');
    return;
  }
  
  // Find active payment method
  let paymentMethod = 'efectivo';
  DOM.paymentBtns.forEach(btn => {
    if (btn.classList.contains('active')) {
      paymentMethod = btn.dataset.method;
    }
  });
  
  const now = new Date();
  
  // Adjust to local timezone date string
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localDate = `${year}-${month}-${day}`;
  
  const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const record = {
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    amount: amount,
    method: paymentMethod,
    date: localDate,
    time: localTime,
    observation: DOM.recordObservation.value.trim()
  };
  
  state.records.unshift(record); // Prepend to history
  saveData();
  
  // Play Success Sound
  SoundEffects.play('success');
  
  // Reset input fields
  DOM.recordObservation.value = '';
  DOM.customAmount.value = '';
  // Set back to default active quick amount
  DOM.quickTariffBtns.forEach(btn => {
    if (parseFloat(btn.dataset.amount) === state.tariffs[1]) {
      btn.click();
    }
  });
  
  // Update views
  renderHistory();
  if (window.updateDashboard) {
    window.updateDashboard();
  }
  
  // Trigger quick success flash alert in document
  showQuickBanner('Pasaje registrado con éxito');
}

// Delete Record
function deleteRecord(id) {
  state.records = state.records.filter(rec => rec.id !== id);
  saveData();
  SoundEffects.play('delete');
  renderHistory();
  if (window.updateDashboard) {
    window.updateDashboard();
  }
}

// Edit Record
function updateRecord(id, updatedFields) {
  const index = state.records.findIndex(rec => rec.id === id);
  if (index !== -1) {
    state.records[index] = { ...state.records[index], ...updatedFields };
    saveData();
    SoundEffects.play('success');
    renderHistory();
    if (window.updateDashboard) {
      window.updateDashboard();
    }
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  
  // Tab Navigation switching
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      SoundEffects.play('click');
      const target = item.dataset.target;
      
      // Update active nav button
      DOM.navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Update active panel content
      DOM.panels.forEach(p => p.classList.remove('active'));
      document.getElementById(target).classList.add('active');
      
      state.activeTab = target;
      
      // Special: Refresh charts when entering dashboard
      if (target === 'dashboard' && window.updateDashboard) {
        window.updateDashboard();
      }
    });
  });
  
  // Theme Toggle click
  DOM.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveData();
    SoundEffects.play('click');
    if (window.updateDashboard) {
      window.updateDashboard(); // Redraw chart with new colors
    }
  });

  // Sound Toggle click
  DOM.soundToggle.addEventListener('click', () => {
    state.soundsEnabled = !state.soundsEnabled;
    applySoundsIndicator();
    saveData();
    if (state.soundsEnabled) {
      SoundEffects.play('click');
    }
  });
  
  // Quick Tariff Amount Buttons
  DOM.quickTariffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      SoundEffects.play('click');
      DOM.quickTariffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      DOM.selectedAmount.textContent = parseFloat(btn.dataset.amount).toFixed(2);
      DOM.customAmount.value = ''; // clear custom
    });
  });
  
  // Custom Amount Input Change
  DOM.customAmount.addEventListener('input', () => {
    const val = parseFloat(DOM.customAmount.value);
    if (!isNaN(val) && val >= 0) {
      DOM.quickTariffBtns.forEach(b => b.classList.remove('active'));
      DOM.selectedAmount.textContent = val.toFixed(2);
    } else {
      // Restore selected quick button value
      const activeBtn = document.querySelector('.btn-quick.active');
      if (activeBtn) {
        DOM.selectedAmount.textContent = parseFloat(activeBtn.dataset.amount).toFixed(2);
      } else {
        DOM.selectedAmount.textContent = "0.00";
      }
    }
  });
  
  // Payment Method buttons grid selection
  DOM.paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      SoundEffects.play('click');
      DOM.paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Submit record pasaje
  DOM.btnRegistrar.addEventListener('click', () => {
    addRecord();
  });
  
  // --- HISTORY FILTERS EVENTS ---
  DOM.searchHistory.addEventListener('input', renderHistory);
  DOM.filterDate.addEventListener('change', renderHistory);
  DOM.sortOrder.addEventListener('change', renderHistory);
  
  DOM.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      SoundEffects.play('click');
      DOM.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderHistory();
    });
  });
  
  // --- SETTINGS PREFERENCES EVENTS ---
  
  // Custom tariff buttons updater
  DOM.quickTariffs.forEach((input, index) => {
    input.addEventListener('change', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) {
        state.tariffs[index] = val;
        saveData();
        updateTariffUI();
        SoundEffects.play('success');
      }
    });
  });
  
  // JSON Database Purge (Double validation popup)
  DOM.btnDatabasePurge.addEventListener('click', () => {
    SoundEffects.play('warning');
    DOM.modalConfirmarVaciado.classList.add('active');
  });
  DOM.btnCancelPurge.addEventListener('click', () => {
    SoundEffects.play('click');
    DOM.modalConfirmarVaciado.classList.remove('active');
  });
  DOM.btnConfirmPurge.addEventListener('click', () => {
    state.records = [];
    saveData();
    DOM.modalConfirmarVaciado.classList.remove('active');
    SoundEffects.play('delete');
    renderHistory();
    if (window.updateDashboard) {
      window.updateDashboard();
    }
    showQuickBanner('Base de datos vaciada');
  });
  
  // Export Data JSON Backup
  DOM.btnBackupExport.addEventListener('click', () => {
    SoundEffects.play('click');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pasajes_v2_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
  
  // Import Data JSON Backup
  DOM.backupFileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported.records && Array.isArray(imported.records)) {
          state.records = imported.records;
          if (imported.tariffs && Array.isArray(imported.tariffs)) {
            state.tariffs = imported.tariffs;
          }
          saveData();
          initApp(); // reload everything
          SoundEffects.play('success');
          showQuickBanner('Copia de seguridad importada');
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  });
  
  // Firebase configuration save
  DOM.btnSaveFirebase.addEventListener('click', () => {
    SoundEffects.play('click');
    state.firebaseConfig.apiKey = DOM.firebaseApiKey.value.trim();
    state.firebaseConfig.dbUrl = DOM.firebaseDbUrl.value.trim();
    saveData();
    showQuickBanner('Configuración Firebase Guardada');
  });
  
  // --- EDIT MODAL INTERACTION ---
  DOM.btnCloseEditModal.addEventListener('click', closeEditModal);
  DOM.btnCancelEdit.addEventListener('click', closeEditModal);
  DOM.btnSaveEdit.addEventListener('click', saveEditChanges);
  
  // --- CONFIRM DELETE MODAL ---
  DOM.btnCancelDelete.addEventListener('click', () => {
    SoundEffects.play('click');
    DOM.modalConfirmarEliminar.classList.remove('active');
  });
  DOM.btnConfirmDelete.addEventListener('click', () => {
    const id = DOM.deleteRecordId.value;
    deleteRecord(id);
    DOM.modalConfirmarEliminar.classList.remove('active');
  });
  
  // --- REPORT EXPORTS EVENTS ---
  DOM.btnExportExcel.addEventListener('click', exportToCSV);
  DOM.btnExportPDF.addEventListener('click', triggerPDFPrint);
}

// --- UTILITY METHODS ---

// Show theme helper
function applyTheme() {
  const root = document.body;
  const isDark = state.theme === 'dark';
  if (isDark) {
    root.classList.remove('light-theme');
    DOM.themeToggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="moon-icon">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
  } else {
    root.classList.add('light-theme');
    DOM.themeToggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sun-icon">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
  }
}

// Show sound indicator helper
function applySoundsIndicator() {
  if (state.soundsEnabled) {
    DOM.soundToggle.classList.add('sound-toggle-active');
    DOM.soundToggle.style.color = 'var(--accent)';
  } else {
    DOM.soundToggle.classList.remove('sound-toggle-active');
    DOM.soundToggle.style.color = 'var(--text-secondary)';
  }
}

// Sync values to Tariff settings panels
function updateTariffUI() {
  // Update Buttons
  DOM.quickTariffBtns.forEach((btn, idx) => {
    btn.dataset.amount = state.tariffs[idx].toFixed(2);
    btn.textContent = `S/${state.tariffs[idx].toFixed(1)}`;
  });
  
  // Set selected amount based on active button
  const activeBtn = document.querySelector('.btn-quick.active');
  if (activeBtn) {
    DOM.selectedAmount.textContent = parseFloat(activeBtn.dataset.amount).toFixed(2);
  }

  // Update Settings Inputs
  state.tariffs.forEach((val, idx) => {
    if (DOM.quickTariffs[idx]) {
      DOM.quickTariffs[idx].value = val.toFixed(2);
    }
  });

  // Populate config fields
  DOM.firebaseApiKey.value = state.firebaseConfig.apiKey;
  DOM.firebaseDbUrl.value = state.firebaseConfig.dbUrl;
}

// Temporary banner message helper
function showQuickBanner(message) {
  const banner = document.createElement('div');
  banner.style.position = 'absolute';
  banner.style.bottom = '80px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%) translateY(20px)';
  banner.style.background = 'var(--bg-tertiary)';
  banner.style.border = '1px solid var(--border-color)';
  banner.style.color = 'var(--text-primary)';
  banner.style.padding = '10px 20px';
  banner.style.borderRadius = '30px';
  banner.style.fontSize = '0.8rem';
  banner.style.fontWeight = '600';
  banner.style.boxShadow = 'var(--shadow-md)';
  banner.style.opacity = '0';
  banner.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  banner.style.zIndex = '9999';
  banner.textContent = message;
  
  const container = document.querySelector('.app-container');
  container.appendChild(banner);
  
  // Animation Entry
  setTimeout(() => {
    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';
  }, 50);
  
  // Animation Leave
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => banner.remove(), 300);
  }, 2200);
}

// --- RENDER HISTORY PANEL LIST ---
function renderHistory() {
  const searchTerm = DOM.searchHistory.value.toLowerCase().trim();
  const dateFilter = DOM.filterDate.value;
  const sort = DOM.sortOrder.value;
  
  // Find active payment filter pill
  let paymentFilter = 'todos';
  DOM.filterPills.forEach(p => {
    if (p.classList.contains('active')) {
      paymentFilter = p.dataset.filterMethod;
    }
  });
  
  // Filter Records
  let filtered = [...state.records];
  
  // Search query filter
  if (searchTerm !== '') {
    filtered = filtered.filter(rec => 
      rec.amount.toFixed(2).includes(searchTerm) || 
      (rec.observation && rec.observation.toLowerCase().includes(searchTerm))
    );
  }
  
  // Payment Method Pill Filter
  if (paymentFilter !== 'todos') {
    filtered = filtered.filter(rec => rec.method === paymentFilter);
  }
  
  // Date range filter
  if (dateFilter !== 'todos') {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    filtered = filtered.filter(rec => {
      const recDate = new Date(rec.date + 'T00:00:00');
      
      if (dateFilter === 'hoy') {
        return recDate.getTime() === today.getTime();
      } else if (dateFilter === 'ayer') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return recDate.getTime() === yesterday.getTime();
      } else if (dateFilter === 'semana') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return recDate >= lastWeek;
      } else if (dateFilter === 'mes') {
        return recDate.getMonth() === today.getMonth() && recDate.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }
  
  // Sort Records
  filtered.sort((a, b) => {
    if (sort === 'recientes') {
      return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
    } else if (sort === 'antiguos') {
      return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    } else if (sort === 'monto-mayor') {
      return b.amount - a.amount;
    } else if (sort === 'monto-menor') {
      return a.amount - b.amount;
    }
    return 0;
  });
  
  // Render
  DOM.historyListContainer.innerHTML = '';
  
  if (filtered.length === 0) {
    DOM.historyListContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <p>No se encontraron registros de pasajes.</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.id = rec.id;
    
    // Nice badge display letter
    const initial = rec.method.charAt(0).toUpperCase();
    
    item.innerHTML = `
      <div class="item-left">
        <div class="item-badge" data-method="${rec.method}">${initial}</div>
        <div class="item-info">
          <span class="item-payment-method">${rec.method === 'transferencia' ? 'Transf.' : rec.method}</span>
          <div class="item-meta">
            <span>${formatDateString(rec.date)}</span>
            <span>•</span>
            <span>${rec.time}</span>
          </div>
          ${rec.observation ? `<span class="item-obs">${rec.observation}</span>` : ''}
        </div>
      </div>
      <div class="item-right">
        <span class="item-amount">S/${rec.amount.toFixed(2)}</span>
        <div class="item-actions">
          <button class="btn-icon edit-btn" onclick="openEditModal('${rec.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon delete-btn" onclick="triggerDeleteConfirm('${rec.id}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    DOM.historyListContainer.appendChild(item);
  });
}

// Convert YYYY-MM-DD to DD/MM/YYYY
function formatDateString(str) {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}

// --- MODALS ACTIONS AND WRAPPERS ---

// Delete warning prompt trigger
window.triggerDeleteConfirm = function(id) {
  SoundEffects.play('warning');
  DOM.deleteRecordId.value = id;
  DOM.modalConfirmarEliminar.classList.add('active');
};

// Open Edit modal populated with data
window.openEditModal = function(id) {
  SoundEffects.play('click');
  const record = state.records.find(rec => rec.id === id);
  if (!record) return;
  
  DOM.editRecordId.value = record.id;
  DOM.editRecordAmount.value = record.amount;
  DOM.editRecordMethod.value = record.method;
  DOM.editRecordDate.value = record.date;
  DOM.editRecordTime.value = record.time;
  DOM.editRecordObservation.value = record.observation || '';
  
  DOM.modalEditar.classList.add('active');
};

function closeEditModal() {
  SoundEffects.play('click');
  DOM.modalEditar.classList.remove('active');
}

function saveEditChanges() {
  const id = DOM.editRecordId.value;
  const amount = parseFloat(DOM.editRecordAmount.value);
  const method = DOM.editRecordMethod.value;
  const date = DOM.editRecordDate.value;
  const time = DOM.editRecordTime.value;
  const obs = DOM.editRecordObservation.value.trim();
  
  if (isNaN(amount) || amount <= 0) {
    alert('Monto inválido.');
    return;
  }
  
  updateRecord(id, {
    amount: amount,
    method: method,
    date: date,
    time: time,
    observation: obs
  });
  
  DOM.modalEditar.classList.remove('active');
  showQuickBanner('Cambios guardados');
}

// --- REPORT GENERATION AND EXPORTS ---

// Export standard UTF-8 CSV structured for Excel
function exportToCSV() {
  SoundEffects.play('success');
  if (state.records.length === 0) {
    alert('No hay pasajes registrados para exportar.');
    return;
  }
  
  // Headers in Spanish
  let csvContent = "\uFEFF"; // UTF-8 BOM to prevent Excel display errors with accent/characters
  csvContent += "ID,Fecha,Hora,Metodo de Pago,Monto (S/),Observaciones\r\n";
  
  state.records.forEach(rec => {
    const cleanObs = (rec.observation || '').replace(/"/g, '""'); // Escape double quotes
    csvContent += `"${rec.id}","${formatDateString(rec.date)}","${rec.time}","${rec.method}","${rec.amount.toFixed(2)}","${cleanObs}"\r\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", url);
  downloadLink.setAttribute("download", `reporte_pasajes_jeanpool_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Trigger printable page view for PDF printing
function triggerPDFPrint() {
  SoundEffects.play('click');
  window.print();
}

// --- OPTIONAL FIREBASE DB SYNC ---
function syncToFirebase() {
  const { apiKey, dbUrl } = state.firebaseConfig;
  if (!apiKey || !dbUrl) return; // Silent return if not configured
  
  // Realtime Database URL cleanup
  let cleanUrl = dbUrl;
  if (!cleanUrl.endsWith('.json')) {
    if (cleanUrl.endsWith('/')) {
      cleanUrl += 'pasajes_v2.json';
    } else {
      cleanUrl += '/pasajes_v2.json';
    }
  }
  
  // Perform asynchronous REST request to sync full state
  fetch(`${cleanUrl}?auth=${apiKey}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state.records)
  })
  .then(res => {
    if (res.ok) {
      console.log('Sincronización con Firebase realizada con éxito.');
    } else {
      console.warn('Error al sincronizar con Firebase.');
    }
  })
  .catch(err => {
    console.warn('Fallo en la comunicación offline con Firebase. Sincronización diferida.', err);
  });
}

// Run app init
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});
