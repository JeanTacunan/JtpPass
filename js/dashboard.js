/* 
 * Registro de Pasajes V2
 * Desarrollado por Ing. Jean Pool Tacunan Palomino
 * Panel Estadístico Inteligente y Gráficos (Chart.js)
 * v2.2 — Filtro de fecha con calendario y navegación por días
 */

// Global Chart Instances to prevent overlap redraws
window.dashboardCharts = {
  trend: null,
  methods: null
};

// --- DATE STATE ---
// selectedDate: null = period mode (hoy/semana/mes), or 'YYYY-MM-DD' string
window.dashboardState = {
  selectedDate: null  // null means use period pill
};

// Helper: get local date string YYYY-MM-DD
function getLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: format YYYY-MM-DD to DD/MM/YYYY for display
function formatDateDisplay(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// --- DATA PROCESSING & KPI CALCULATION ---
window.updateDashboard = function () {
  const records = state.records || [];

  // Date Helpers (Local timezone)
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Filter only cash (efectivo) and yape payments for KPIs
  const paymentFiltered = records.filter(r => r.method === 'efectivo' || r.method === 'yape');

  // --- Determine filtering mode ---
  let periodRecords = [];
  let trendLabel = '';

  const ds = window.dashboardState;

  if (ds.selectedDate !== null) {
    // FECHA mode: filter by specific date
    periodRecords = paymentFiltered.filter(r => r.date === ds.selectedDate);
    trendLabel = `Fecha: ${formatDateDisplay(ds.selectedDate)}`;
  } else {
    // PERIOD mode: use period pill
    const activePeriodEl = document.querySelector('#dashboardPeriodPills .pill.active');
    const period = activePeriodEl ? activePeriodEl.dataset.period : 'hoy';

    if (period === 'hoy') {
      periodRecords = paymentFiltered.filter(r => r.date === todayStr);
    } else if (period === 'semana') {
      periodRecords = paymentFiltered.filter(r => {
        const rDate = new Date(r.date + 'T00:00:00');
        return rDate >= sevenDaysAgo;
      });
    } else if (period === 'mes') {
      periodRecords = paymentFiltered.filter(r => {
        const rDate = new Date(r.date + 'T00:00:00');
        return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
      });
    }
    trendLabel = period;
  }

  // 1. KPI: Total Earnings
  const totalPeriod = periodRecords.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiTotal').textContent = `S/${totalPeriod.toFixed(2)}`;

  // 2. KPI: Efectivo Total
  const recordsEfectivo = periodRecords.filter(r => r.method === 'efectivo');
  const totalEfectivo = recordsEfectivo.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiEfectivo').textContent = `S/${totalEfectivo.toFixed(2)}`;
  document.getElementById('footerEfectivo').textContent = `${recordsEfectivo.length} pasajes`;

  // 3. KPI: Yape Total
  const recordsYape = periodRecords.filter(r => r.method === 'yape');
  const totalYape = recordsYape.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiYape').textContent = `S/${totalYape.toFixed(2)}`;
  document.getElementById('footerYape').textContent = `${recordsYape.length} pasajes`;

  // 4. KPI: Vueltas (Active Vuelta)
  document.getElementById('kpiVueltas').textContent = state.activeVuelta;

  // 5. KPI: Pasajeros (Trips Count)
  document.getElementById('kpiPasajeros').textContent = periodRecords.length;

  // 6. KPI: Promedio por Viaje
  const promedio = periodRecords.length > 0 ? (totalPeriod / periodRecords.length) : 0;
  document.getElementById('kpiPromedio').textContent = `S/${promedio.toFixed(2)}`;

  // Trend footer
  const trendElement = document.getElementById('trendGeneral');
  if (ds.selectedDate !== null) {
    // Show date info in trend
    trendElement.className = 'stat-footer';
    trendElement.textContent = periodRecords.length > 0
      ? `${periodRecords.length} pasaje(s) registrado(s)`
      : 'Sin registros para esta fecha';
  } else {
    const period = document.querySelector('#dashboardPeriodPills .pill.active')?.dataset.period || 'hoy';
    if (period === 'hoy') {
      const recordsAyer = paymentFiltered.filter(r => r.date === yesterdayStr);
      const totalAyer = recordsAyer.reduce((sum, r) => sum + r.amount, 0);

      if (totalAyer > 0) {
        const diffPct = ((totalPeriod - totalAyer) / totalAyer) * 100;
        if (diffPct >= 0) {
          trendElement.className = 'stat-footer stat-trend-up';
          trendElement.innerHTML = `
            <svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            +${diffPct.toFixed(1)}% vs ayer
          `;
        } else {
          trendElement.className = 'stat-footer stat-trend-down';
          trendElement.innerHTML = `
            <svg style="width:10px;height:10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            ${diffPct.toFixed(1)}% vs ayer
          `;
        }
      } else {
        trendElement.className = 'stat-footer';
        trendElement.textContent = totalPeriod > 0 ? `+S/${totalPeriod.toFixed(2)} vs ayer` : 'Sin registros ayer';
      }
    } else {
      trendElement.className = 'stat-footer';
      trendElement.textContent = period === 'semana' ? 'Últimos 7 días' : 'Mes actual';
    }
  }

  // Render Charts
  drawTrendChart(paymentFiltered);

  // Method counts in the selected period
  const methodCounts = { efectivo: 0, yape: 0 };
  periodRecords.forEach(r => {
    if (methodCounts[r.method] !== undefined) {
      methodCounts[r.method]++;
    }
  });
  drawMethodsChart(methodCounts);
};

// --- CHART 1: WEEKLY TENDENCY (LINE CHART) ---
function drawTrendChart(records) {
  const chartEl = document.getElementById('chartTrend');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');

  // Build last 7 days labels and sum incomes
  const labels = [];
  const data = [];

  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const accentColor = isDark ? '#00f0ff' : '#2563eb';
  const accentColorEnd = isDark ? '#3b82f6' : '#1d4ed8';

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateStr(d);

    // Label format "DD/MM"
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`);

    // Calculate total for this day
    const dayTotal = records.filter(r => r.date === dStr).reduce((sum, r) => sum + r.amount, 0);
    data.push(dayTotal);
  }

  if (window.dashboardCharts.trend) {
    window.dashboardCharts.trend.destroy();
  }

  // Gradient fill for sleek linear style
  const gradient = ctx.createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, isDark ? 'rgba(0, 240, 255, 0.2)' : 'rgba(37, 99, 235, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  window.dashboardCharts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ingresos (S/)',
        data: data,
        borderColor: accentColor,
        borderWidth: 3,
        pointBackgroundColor: accentColorEnd,
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        backgroundColor: gradient
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#0f131c' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#f8fafc' : '#0f172a',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (context) => `S/${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 9 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 9 },
            callback: (val) => `S/${val}`
          }
        }
      }
    }
  });
}

// --- CHART 2: METHODS DISTRIBUTION (DONUT CHART) ---
function drawMethodsChart(counts) {
  const chartEl = document.getElementById('chartMethods');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  // Data for only Efectivo and Yape
  const data = [counts.efectivo, counts.yape];
  const hasData = data.some(v => v > 0);
  const labels = ['Efectivo', 'Yape'];
  const colors = ['#10b981', '#a21caf']; // green and purple
  const hoverColors = ['#059669', '#701a75'];

  if (window.dashboardCharts.methods) {
    window.dashboardCharts.methods.destroy();
  }

  window.dashboardCharts.methods = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: hasData ? data : [1, 1], // fallback to avoid empty chart
        backgroundColor: hasData ? colors : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.03)'],
        borderColor: isDark ? '#0f131c' : '#ffffff',
        borderWidth: 2,
        hoverBackgroundColor: hasData ? hoverColors : undefined
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' },
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            padding: 12
          }
        },
        tooltip: {
          enabled: hasData,
          backgroundColor: isDark ? '#0f131c' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#f8fafc' : '#0f172a',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = data.reduce((a, b) => a + b, 0);
              const perc = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${label}: ${value} viajes (${perc}%)`;
            }
          }
        }
      }
    }
  });
}

// --- DATE CHIP LOGIC ---
function activateDateChip(dateStr) {
  window.dashboardState.selectedDate = dateStr;

  // Update chip label
  const label = document.getElementById('dashboardDateLabel');
  if (label) label.textContent = formatDateDisplay(dateStr);

  // Deactivate all period pills, activate date chip
  const pills = document.querySelectorAll('#dashboardPeriodPills .pill');
  pills.forEach(p => p.classList.remove('active'));
  const chip = document.getElementById('dashboardDateChip');
  if (chip) chip.classList.add('active');

  // Show day navigation bar
  const navBar = document.getElementById('dayNavBar');
  if (navBar) {
    navBar.style.display = 'flex';
    const navLabel = document.getElementById('dayNavLabel');
    if (navLabel) navLabel.textContent = formatDateDisplay(dateStr);
  }

  window.updateDashboard();
}

function clearDateFilter() {
  window.dashboardState.selectedDate = null;

  // Reset chip label
  const label = document.getElementById('dashboardDateLabel');
  if (label) label.textContent = 'Fecha';
  const input = document.getElementById('dashboardDateInput');
  if (input) input.value = '';

  // Hide navigation bar
  const navBar = document.getElementById('dayNavBar');
  if (navBar) navBar.style.display = 'none';
}

// Navigate between days
function navigateDay(delta) {
  if (window.dashboardState.selectedDate === null) return;

  const current = new Date(window.dashboardState.selectedDate + 'T00:00:00');
  current.setDate(current.getDate() + delta);
  const newDateStr = getLocalDateStr(current);

  activateDateChip(newDateStr);

  // Keep input in sync
  const input = document.getElementById('dashboardDateInput');
  if (input) input.value = newDateStr;
}

// --- ATTACH EVENT LISTENERS ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {

  // Period pills
  const periodPills = document.querySelectorAll('#dashboardPeriodPills .pill:not(.pill-date)');
  periodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      if (window.SoundEffects) window.SoundEffects.play('click');

      // Clear date filter when period pill is clicked
      clearDateFilter();

      // Activate clicked period pill
      document.querySelectorAll('#dashboardPeriodPills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      window.updateDashboard();
    });
  });

  // Date chip click → open native date picker
  const dateChip = document.getElementById('dashboardDateChip');
  const dateInput = document.getElementById('dashboardDateInput');

  if (dateChip && dateInput) {
    dateChip.addEventListener('click', (e) => {
      if (window.SoundEffects) window.SoundEffects.play('click');

      // Set today as default value if empty
      if (!dateInput.value) {
        const now = new Date();
        dateInput.value = getLocalDateStr(now);
      }

      // Max = today (cannot pick future dates)
      dateInput.max = getLocalDateStr(new Date());

      // Programmatically open the native picker
      dateInput.style.pointerEvents = 'auto';
      dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
      dateInput.style.pointerEvents = 'none';
    });

    dateInput.addEventListener('change', () => {
      const val = dateInput.value;
      if (val) {
        activateDateChip(val);
      }
    });
  }

  // Day navigation arrows
  const btnPrev = document.getElementById('btnPrevDay');
  const btnNext = document.getElementById('btnNextDay');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (window.SoundEffects) window.SoundEffects.play('click');
      navigateDay(-1);
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (window.SoundEffects) window.SoundEffects.play('click');
      // Don't allow going beyond today
      if (window.dashboardState.selectedDate) {
        const todayStr = getLocalDateStr(new Date());
        if (window.dashboardState.selectedDate < todayStr) {
          navigateDay(+1);
        }
      }
    });
  }
});
