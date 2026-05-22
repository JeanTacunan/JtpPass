/* 
 * Registro de Pasajes V2
 * Desarrollado por Ing. Jean Pool Tacunan Palomino
 * Panel Estadístico Inteligente y Gráficos (Chart.js)
 */

// Global Chart Instances to prevent overlap redraws
window.dashboardCharts = {
  trend: null,
  methods: null,
  hours: null
};

// --- DATA PROCESSING & KPI CALCULATION ---
window.updateDashboard = function() {
  const records = state.records || [];
  
  // Date Helpers
  const todayStr = new Date().toISOString().split('T')[0];
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  // 1. KPI: Total Hoy
  const recordsHoy = records.filter(r => r.date === todayStr);
  const totalHoy = recordsHoy.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiHoy').textContent = `S/${totalHoy.toFixed(2)}`;
  
  // Trend comparison Hoy vs Ayer
  const recordsAyer = records.filter(r => r.date === yesterdayStr);
  const totalAyer = recordsAyer.reduce((sum, r) => sum + r.amount, 0);
  const trendElement = document.getElementById('trendHoy');
  
  if (totalAyer > 0) {
    const diffPct = ((totalHoy - totalAyer) / totalAyer) * 100;
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
    trendElement.textContent = totalHoy > 0 ? `+S/${totalHoy.toFixed(2)} vs ayer` : 'Sin registros ayer';
  }
  
  // 2. KPI: Total Semana (Last 7 days)
  const recordsSemana = records.filter(r => {
    const rDate = new Date(r.date + 'T00:00:00');
    return rDate >= sevenDaysAgo;
  });
  const totalSemana = recordsSemana.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiSemana').textContent = `S/${totalSemana.toFixed(2)}`;
  
  // 3. KPI: Total Mes (Current calendar month)
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const recordsMes = records.filter(r => {
    const rDate = new Date(r.date + 'T00:00:00');
    return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
  });
  const totalMes = recordsMes.reduce((sum, r) => sum + r.amount, 0);
  document.getElementById('kpiMes').textContent = `S/${totalMes.toFixed(2)}`;
  
  // 4. KPI: Pasajeros
  const totalPasajeros = records.length;
  document.getElementById('kpiPasajeros').textContent = totalPasajeros;
  
  // 5. KPI: Promedio por Viaje
  const promedio = totalPasajeros > 0 ? (records.reduce((sum, r) => sum + r.amount, 0) / totalPasajeros) : 0;
  document.getElementById('kpiPromedio').textContent = `S/${promedio.toFixed(2)}`;
  
  // 6. KPI: Método Popular & Hora Peak
  let methodCounts = { efectivo: 0, yape: 0, plin: 0, transferencia: 0 };
  let hourCounts = Array(24).fill(0);
  
  records.forEach(r => {
    // Payment method counters
    if (methodCounts[r.method] !== undefined) {
      methodCounts[r.method]++;
    }
    // Hour counters
    if (r.time) {
      const hour = parseInt(r.time.split(':')[0]);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        hourCounts[hour]++;
      }
    }
  });
  
  // Popular Payment Method name
  let maxMethodCount = 0;
  let popularMethod = '-';
  Object.keys(methodCounts).forEach(m => {
    if (methodCounts[m] > maxMethodCount) {
      maxMethodCount = methodCounts[m];
      popularMethod = m.charAt(0).toUpperCase() + m.slice(1);
      if (popularMethod === 'Transferencia') popularMethod = 'Transf.';
    }
  });
  document.getElementById('kpiMetodo').textContent = popularMethod;
  
  // Draw Charts
  drawTrendChart(records);
  drawMethodsChart(methodCounts);
  drawHoursChart(hourCounts);
};

// --- CHART 1: WEEKLY TENDENCY (LINE CHART) ---
function drawTrendChart(records) {
  const ctx = document.getElementById('chartTrend').getContext('2d');
  
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
    const dStr = d.toISOString().split('T')[0];
    
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
  const ctx = document.getElementById('chartMethods').getContext('2d');
  
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  
  const data = [counts.efectivo, counts.yape, counts.plin, counts.transferencia];
  const hasData = data.some(v => v > 0);
  
  if (window.dashboardCharts.methods) {
    window.dashboardCharts.methods.destroy();
  }
  
  // Elegant flat design colors matching our style variables
  const colors = ['#10b981', '#a21caf', '#00bcd4', '#3b82f6'];
  const hoverColors = ['#059669', '#701a75', '#0097a7', '#2563eb'];
  
  window.dashboardCharts.methods = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Efectivo', 'Yape', 'Plin', 'Transf.'],
      datasets: [{
        data: hasData ? data : [1, 1, 1, 1], // fallback draw equal slices if empty
        backgroundColor: hasData ? colors : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.03)'],
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
          enabled: hasData, // Disable tooltips if there's no real data
          backgroundColor: isDark ? '#0f131c' : '#ffffff',
          titleColor: isDark ? '#f8fafc' : '#0f172a',
          bodyColor: isDark ? '#f8fafc' : '#0f172a',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return ` ${label}: ${value} viajes (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// --- CHART 3: TRAFFIC BY HOUR (BAR CHART) ---
function drawHoursChart(hourCounts) {
  const ctx = document.getElementById('chartHours').getContext('2d');
  
  const isDark = state.theme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const barColor = isDark ? 'rgba(0, 240, 255, 0.7)' : 'rgba(37, 99, 235, 0.7)';
  const barHoverColor = isDark ? '#00f0ff' : '#2563eb';
  
  // Format labels 00h, 01h, etc.
  const allLabels = Array(24).fill(0).map((_, i) => `${String(i).padStart(2, '0')}h`);
  
  // To keep it clean for mobile, let's filter and only show hours that actually have records.
  // If no hours have records, we show 08h to 20h as default window.
  const hasData = hourCounts.some(v => v > 0);
  let displayLabels = [];
  let displayData = [];
  
  if (hasData) {
    // Find first and last hour with data
    let firstHour = 24;
    let lastHour = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > 0) {
        if (i < firstHour) firstHour = i;
        if (i > lastHour) lastHour = i;
      }
    }
    
    // Pad window by 1 hour on each side
    const start = Math.max(0, firstHour - 1);
    const end = Math.min(23, lastHour + 1);
    
    for (let i = start; i <= end; i++) {
      displayLabels.push(allLabels[i]);
      displayData.push(hourCounts[i]);
    }
  } else {
    // Default window (8 AM to 8 PM)
    for (let i = 8; i <= 20; i++) {
      displayLabels.push(allLabels[i]);
      displayData.push(0);
    }
  }
  
  if (window.dashboardCharts.hours) {
    window.dashboardCharts.hours.destroy();
  }
  
  window.dashboardCharts.hours = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: displayLabels,
      datasets: [{
        label: 'Pasajeros',
        data: displayData,
        backgroundColor: barColor,
        hoverBackgroundColor: barHoverColor,
        borderRadius: 4,
        borderWidth: 0
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
            label: (context) => `${context.parsed.y} pasajeros`
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
            precision: 0 // integer only
          }
        }
      }
    }
  });
}
