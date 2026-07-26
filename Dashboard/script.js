// 1. IMPORT FIREBASE MODULES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 2. YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDJZo227pWs4uZ6VfRrb1CLeptAeMWQ294",
  authDomain: "aura-tradez.firebaseapp.com",
  projectId: "aura-tradez",
  storageBucket: "aura-tradez.firebasestorage.app",
  messagingSenderId: "561727559469",
  appId: "1:561727559469:web:6fbfb99a9a9c34dc9ce5a4",
  measurementId: "G-GN30L56NP0"
};

// 3. INITIALIZE FIREBASE, FIRESTORE, & AUTH
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 4. GLOBAL VARIABLES
let trades = [];
let filteredTrades = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortColumn = 'entryDate';
let sortDirection = 'DESC';
let currentDirection = 'BUY';
let currentUser = null; 

window.addEventListener('DOMContentLoaded', () => {
  initParticleBackground();
  init3DTilt();
  initKeyboardShortcuts();
  
  // Set default date (YYYY-MM-DD)
  const todayISO = new Date().toISOString().slice(0, 10);
  document.getElementById('form-entry-date').value = todayISO;
  document.getElementById('form-exit-date').value = todayISO;

  ['form-lot', 'form-entry', 'form-exit'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLivePreview);
  });

  document.getElementById('trade-form').addEventListener('submit', handleFormSubmit);

  window.addEventListener('resize', debounce(() => {
    renderAllCharts();
  }, 250));

  // --- CHECK WHO IS LOGGED IN ---
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      // Only load data AFTER we know who the user is
      loadDataFromFirebase();
    } else {
      // If no one is logged in, kick them back to the login page
      window.location.href = "../Login/login.html";
    }
  });
});

// --- FIREBASE DATABASE FUNCTIONS ---

// Real-time listener for Firestore (NOW FILTERED BY USER)
function loadDataFromFirebase() {
  if (!currentUser) return;

  const q = query(
    collection(db, "trades"), 
    where("userId", "==", currentUser.uid),
    orderBy("entryDate", "desc")
  );
  
  onSnapshot(q, (snapshot) => {
    trades = [];
    snapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() });
    });
    refreshUI();
  }, (error) => {
    console.error("Error loading trades: ", error);
    showToast("Error connecting to database", "error");
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showToast("You must be logged in to save trades.", "error");
    return;
  }

  const editId = document.getElementById('edit-trade-id').value;
  const entry = parseFloat(document.getElementById('form-entry').value);
  const exit = parseFloat(document.getElementById('form-exit').value);
  const lot = parseFloat(document.getElementById('form-lot').value);
  const entryDate = document.getElementById('form-entry-date').value;
  const exitDate = document.getElementById('form-exit-date').value;
  const notes = document.getElementById('form-notes').value.trim();
  const submitBtn = document.getElementById('submit-trade-btn');

  if (!entry || !exit || !lot || !entryDate || !exitDate) {
    showToast('Please complete all required fields.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';

  const calc = calculateXAUUSD(entry, exit, lot, currentDirection);
  
  const tradeData = {
    userId: currentUser.uid, 
    entryPrice: entry,
    exitPrice: exit,
    lotSize: lot,
    direction: currentDirection,
    entryDate,
    exitDate,
    notes,
    pips: calc.pips,
    profitLoss: calc.pnl,
    tradeStatus: 'CLOSED'
  };

  try {
    if (editId) {
      const tradeRef = doc(db, "trades", editId);
      await updateDoc(tradeRef, tradeData);
      showToast('Trade successfully updated!', 'success');
    } else {
      await addDoc(collection(db, "trades"), tradeData);
      showToast('New XAUUSD Trade Logged!', 'success');
    }
    resetForm();
  } catch (error) {
    console.error("Error saving trade: ", error);
    showToast("Error saving trade", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }
}

async function deleteTrade(id) {
  try {
    await deleteDoc(doc(db, "trades", id));
    showToast('Trade deleted permanently.', 'warning');
  } catch (error) {
    console.error("Error deleting trade: ", error);
    showToast("Error deleting trade", "error");
  }
}

// --- CORE APP FUNCTIONS ---

function calculateXAUUSD(entry, exit, lots, dir) {
  entry = parseFloat(entry) || 0;
  exit = parseFloat(exit) || 0;
  lots = parseFloat(lots) || 0;
  let pips = dir === 'BUY' ? (exit - entry) * 10 : (entry - exit) * 10;
  const pnl = pips * (lots * 10);
  return { pips: parseFloat(pips.toFixed(1)), pnl: parseFloat(pnl.toFixed(2)) };
}

function updateLivePreview() {
  const lot = parseFloat(document.getElementById('form-lot').value) || 0;
  const entry = parseFloat(document.getElementById('form-entry').value) || 0;
  const exit = parseFloat(document.getElementById('form-exit').value) || 0;

  if (entry > 0 && exit > 0 && lot > 0) {
    const res = calculateXAUUSD(entry, exit, lot, currentDirection);
    const pipsEl = document.getElementById('preview-pips');
    const pnlEl = document.getElementById('preview-pnl');

    pipsEl.textContent = (res.pips >= 0 ? '+' : '') + res.pips.toFixed(1);
    pnlEl.textContent = (res.pnl >= 0 ? '+$' : '-$') + Math.abs(res.pnl).toFixed(2);
    pipsEl.style.color = res.pips >= 0 ? 'var(--profit)' : 'var(--loss)';
    pnlEl.style.color = res.pnl >= 0 ? 'var(--profit)' : 'var(--loss)';
  } else {
    document.getElementById('preview-pips').textContent = '0.0';
    document.getElementById('preview-pnl').textContent = '$0.00';
    document.getElementById('preview-pips').style.color = 'var(--text-primary)';
    document.getElementById('preview-pnl').style.color = 'var(--text-primary)';
  }
}

window.setDirection = function(dir) {
  currentDirection = dir;
  document.getElementById('dir-buy-btn').classList.toggle('active', dir === 'BUY');
  document.getElementById('dir-sell-btn').classList.toggle('active', dir === 'SELL');
  updateLivePreview();
}

window.setLotSize = function(val) {
  document.getElementById('form-lot').value = val;
  document.querySelectorAll('.lot-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === val);
  });
  updateLivePreview();
}

window.editTrade = function(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;

  document.getElementById('edit-trade-id').value = trade.id;
  document.getElementById('form-entry').value = trade.entryPrice;
  document.getElementById('form-exit').value = trade.exitPrice;
  document.getElementById('form-lot').value = trade.lotSize;
  document.getElementById('form-notes').value = trade.notes;
  document.getElementById('form-entry-date').value = trade.entryDate;
  document.getElementById('form-exit-date').value = trade.exitDate;

  window.setDirection(trade.direction);
  document.getElementById('submit-trade-btn').querySelector('span').textContent = 'Update Trade';
  showToast('Trade loaded for editing.', 'warning');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.resetForm = function() {
  document.getElementById('trade-form').reset();
  document.getElementById('edit-trade-id').value = '';
  window.setDirection('BUY');
  window.setLotSize(0.01);
  document.getElementById('submit-trade-btn').querySelector('span').textContent = 'Submit Trade (Ctrl+↵)';
  
  const todayISO = new Date().toISOString().slice(0, 10);
  document.getElementById('form-entry-date').value = todayISO;
  document.getElementById('form-exit-date').value = todayISO;
  updateLivePreview();
}

function refreshUI() {
  applyFilters();
  updateTopStats();
  updatePerformanceMetrics();
  renderTable();
  renderAllCharts();
}

function updateTopStats() {
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.profitLoss > 0).length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
  const totalPnl = trades.reduce((acc, t) => acc + t.profitLoss, 0);
  const totalPips = trades.reduce((acc, t) => acc + t.pips, 0);

  document.getElementById('stat-total-trades').textContent = totalTrades;
  document.getElementById('stat-win-trades').textContent = wins;
  document.getElementById('stat-win-sub').textContent = `${winRate}% Win Consistency`;
  document.getElementById('stat-win-rate').textContent = `${winRate}%`;

  const pnlEl = document.getElementById('stat-total-pnl');
  pnlEl.textContent = (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
  pnlEl.style.color = totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)';

  const headerPnl = document.getElementById('header-pnl-val');
  headerPnl.textContent = (totalPnl >= 0 ? '+$' : '-$') + Math.abs(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2 });
  headerPnl.className = totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg';
  document.getElementById('stat-pnl-sub').textContent = `${totalPips >= 0 ? '+' : ''}${totalPips.toFixed(1)} Cumulative Pips`;
}

function updatePerformanceMetrics() {
  const winningTrades = trades.filter(t => t.profitLoss > 0);
  const losingTrades = trades.filter(t => t.profitLoss < 0);
  const grossProfit = winningTrades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.profitLoss, 0));

  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '∞' : '0.00');
  const avgWin = winningTrades.length > 0 ? (grossProfit / winningTrades.length) : 0;
  const avgLoss = losingTrades.length > 0 ? (grossLoss / losingTrades.length) : 0;

  const maxWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profitLoss)) : 0;
  const maxLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitLoss)) : 0;

  let peak = 0, maxDrawdown = 0, cumulative = 0;
  const sortedChronological = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));

  sortedChronological.forEach(t => {
    cumulative += t.profitLoss;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  const maxDdPct = peak > 0 ? ((maxDrawdown / peak) * 100).toFixed(1) : '0.0';

  document.getElementById('m-profit-factor').textContent = profitFactor;
  document.getElementById('m-avg-win').textContent = '+$' + avgWin.toFixed(2);
  document.getElementById('m-avg-loss').textContent = '-$' + avgLoss.toFixed(2);
  document.getElementById('m-max-win').textContent = '+$' + maxWin.toFixed(2);
  document.getElementById('m-max-loss').textContent = '-$' + Math.abs(maxLoss).toFixed(2);
  document.getElementById('m-max-dd').textContent = maxDdPct + '%';
}

window.onFilterChange = function() {
  currentPage = 1;
  refreshUI();
}

function applyFilters() {
  const search = document.getElementById('table-search').value.toLowerCase();
  const dirFilter = document.getElementById('filter-dir').value;
  const outcomeFilter = document.getElementById('filter-outcome').value;

  filteredTrades = trades.filter(t => {
    const matchesSearch = (t.notes && t.notes.toLowerCase().includes(search)) ||
                          t.entryPrice.toString().includes(search) ||
                          t.exitPrice.toString().includes(search);
    const matchesDir = dirFilter === 'ALL' || t.direction === dirFilter;
    let matchesOutcome = true;
    if (outcomeFilter === 'WIN') matchesOutcome = t.profitLoss > 0;
    if (outcomeFilter === 'LOSS') matchesOutcome = t.profitLoss < 0;

    return matchesSearch && matchesDir && matchesOutcome;
  });

  filteredTrades.sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];
    if (sortColumn === 'entryDate') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    if (valA < valB) return sortDirection === 'ASC' ? -1 : 1;
    if (valA > valB) return sortDirection === 'ASC' ? 1 : -1;
    return 0;
  });
}

window.sortTable = function(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
  } else {
    sortColumn = column;
    sortDirection = 'DESC';
  }
  refreshUI();
}

function renderTable() {
  const tbody = document.getElementById('trade-tbody');
  tbody.innerHTML = '';
  const totalItems = filteredTrades.length;
  document.getElementById('table-count-label').textContent = `Showing ${totalItems} trades`;

  if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 30px;">No trades found.</td></tr>`;
    document.getElementById('pagination-btns').innerHTML = '';
    document.getElementById('page-info').textContent = 'Page 0 of 0';
    return;
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageData = filteredTrades.slice(startIndex, startIndex + itemsPerPage);

  pageData.forEach((t, index) => {
    const tr = document.createElement('tr');
    tr.className = t.profitLoss >= 0 ? 'row-profit' : 'row-loss';
    
    tr.innerHTML = `
      <td>${startIndex + index + 1}</td>
      <td>${t.entryDate}</td>
      <td><span class="badge ${t.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}">${t.direction}</span></td>
      <td style="font-weight: 700;">${t.lotSize.toFixed(2)}</td>
      <td>$${t.entryPrice.toFixed(2)}</td>
      <td>$${t.exitPrice.toFixed(2)}</td>
      <td style="font-weight: 700; color: ${t.pips >= 0 ? 'var(--profit)' : 'var(--loss)'}">${t.pips >= 0 ? '+' : ''}${t.pips.toFixed(1)}</td>
      <td class="${t.profitLoss >= 0 ? 'pnl-pos' : 'pnl-neg'}">${t.profitLoss >= 0 ? '+$' : '-$'}${Math.abs(t.profitLoss).toFixed(2)}</td>
      <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary);">${escapeHTML(t.notes || '-')}</td>
      <td style="text-align: right;">
        <button class="btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editTrade('${t.id}')">✏️ Edit</button>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="confirmDeleteTrade('${t.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  const pageBtnsContainer = document.getElementById('pagination-btns');
  pageBtnsContainer.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const pBtn = document.createElement('button');
    pBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pBtn.textContent = i;
    pBtn.onclick = () => { currentPage = i; renderTable(); };
    pageBtnsContainer.appendChild(pBtn);
  }
}

window.confirmDeleteTrade = function(id) {
  openModal('Delete Trade Log', 'Are you sure you want to permanently delete this trade?', () => deleteTrade(id));
}

/* CANVAS CHARTS SUITE */
function renderAllCharts() {
  renderEquityCurve();
  renderOutcomeDonut();
  renderMonthlyBarChart();
  renderWinRateGauge();
}

function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width: rect.width, height: rect.height };
}

function renderEquityCurve() {
  const { ctx, width, height } = setupCanvas('canvas-equity');
  if (trades.length === 0) return drawEmptyChartState(ctx, width, height, 'No Trade Data');

  const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  let cumulative = 0;
  const dataPoints = [0];
  sorted.forEach(t => { cumulative += t.profitLoss; dataPoints.push(cumulative); });

  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const minVal = Math.min(0, ...dataPoints);
  const maxVal = Math.max(10, ...dataPoints);
  const range = (maxVal - minVal) || 1;

  ctx.strokeStyle = '#30363D';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
  }
  ctx.stroke();

  const points = dataPoints.map((val, i) => {
    const x = padding + (chartWidth / (dataPoints.length - 1 || 1)) * i;
    const y = height - padding - ((val - minVal) / range) * chartHeight;
    return { x, y, val };
  });

  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  const isOverallProfit = dataPoints[dataPoints.length - 1] >= 0;
  gradient.addColorStop(0, isOverallProfit ? 'rgba(63, 185, 80, 0.35)' : 'rgba(248, 81, 73, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = isOverallProfit ? '#3FB950' : '#F85149';
  ctx.lineWidth = 3;
  points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();

  bindCanvasHover('canvas-equity', 'tooltip-equity', (mouseX) => {
    const closest = points.reduce((prev, curr) => Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev);
    if (Math.abs(closest.x - mouseX) < 25) {
      return { x: closest.x, y: closest.y, html: `Equity: <b>$${closest.val.toFixed(2)}</b>` };
    }
    return null;
  });
}

function renderOutcomeDonut() {
  const { ctx, width, height } = setupCanvas('canvas-donut');
  const wins = trades.filter(t => t.profitLoss > 0).length;
  const losses = trades.filter(t => t.profitLoss < 0).length;
  const breakevens = trades.filter(t => t.profitLoss === 0).length;
  const total = trades.length;

  if (total === 0) return drawEmptyChartState(ctx, width, height, 'No Trade Data');

  const centerX = width / 2, centerY = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 25, innerRadius = outerRadius * 0.65;
  const slices = [{ label: 'Wins', count: wins, color: '#3FB950' }, { label: 'Losses', count: losses, color: '#F85149' }, { label: 'Even', count: breakevens, color: '#8B949E' }];
  let startAngle = -Math.PI / 2;

  slices.forEach(slice => {
    if (slice.count === 0) return;
    const sliceAngle = (slice.count / total) * (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    startAngle += sliceAngle;
  });
  ctx.fillStyle = '#F0F6FC';
  ctx.font = 'bold 16px -apple-system';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${total} Trades`, centerX, centerY);
}

function renderMonthlyBarChart() {
  const { ctx, width, height } = setupCanvas('canvas-bar');
  if (trades.length === 0) return drawEmptyChartState(ctx, width, height, 'No Trade Data');

  const monthlyPnl = {};
  trades.forEach(t => {
    const key = t.entryDate.slice(0, 7);
    monthlyPnl[key] = (monthlyPnl[key] || 0) + t.profitLoss;
  });
  const sortedMonths = Object.keys(monthlyPnl).sort();
  const padding = 35;
  const chartWidth = width - padding * 2, chartHeight = height - padding * 2;
  const values = Object.values(monthlyPnl);
  const maxVal = Math.max(10, ...values), minVal = Math.min(0, ...values);
  const range = (maxVal - minVal) || 1;
  const zeroY = height - padding - ((0 - minVal) / range) * chartHeight;

  ctx.strokeStyle = '#58A6FF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(width - padding, zeroY);
  ctx.stroke();

  const barWidth = Math.min(40, (chartWidth / sortedMonths.length) - 10);
  sortedMonths.forEach((monthKey, idx) => {
    const pnl = monthlyPnl[monthKey];
    const x = padding + (idx * (chartWidth / sortedMonths.length)) + (chartWidth / sortedMonths.length) / 2 - barWidth / 2;
    const y = height - padding - ((pnl - minVal) / range) * chartHeight;
    const h = zeroY - y;
    ctx.fillStyle = pnl >= 0 ? '#3FB950' : '#F85149';
    ctx.fillRect(x, pnl >= 0 ? y : zeroY, barWidth, Math.abs(h));
    ctx.fillStyle = '#8B949E';
    ctx.font = '10px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(monthKey.slice(5), x + barWidth / 2, height - 12);
  });
}

function renderWinRateGauge() {
  const { ctx, width, height } = setupCanvas('canvas-gauge');
  const wins = trades.filter(t => t.profitLoss > 0).length, total = trades.length;
  const winRate = total > 0 ? wins / total : 0;
  const centerX = width / 2, centerY = height - 25, radius = Math.min(width, height) - 40;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#21262D';
  ctx.stroke();

  if (total > 0) {
    const grad = ctx.createLinearGradient(centerX - radius, 0, centerX + radius, 0);
    grad.addColorStop(0, '#F85149'); grad.addColorStop(0.5, '#E6B800'); grad.addColorStop(1, '#3FB950');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + (winRate * Math.PI), false);
    ctx.lineWidth = 18;
    ctx.strokeStyle = grad;
    ctx.stroke();
  }

  const needleAngle = Math.PI + (winRate * Math.PI), needleLen = radius - 10;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + needleLen * Math.cos(needleAngle), centerY + needleLen * Math.sin(needleAngle));
  ctx.strokeStyle = '#F0F6FC';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#E6B800';
  ctx.fill();
  ctx.fillStyle = '#F0F6FC';
  ctx.font = 'bold 20px -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`${(winRate * 100).toFixed(1)}%`, centerX, centerY - 25);
}

function drawEmptyChartState(ctx, width, height, label) {
  ctx.fillStyle = '#8B949E';
  ctx.font = '12px -apple-system';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);
}

function bindCanvasHover(canvasId, tooltipId, calculateTooltip) {
  const canvas = document.getElementById(canvasId), tooltip = document.getElementById(tooltipId);
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const res = calculateTooltip(e.clientX - rect.left, e.clientY - rect.top);
    if (res) {
      tooltip.style.opacity = '1';
      tooltip.style.transform = `translate(${res.x + 10}px, ${res.y - 25}px)`;
      tooltip.innerHTML = res.html;
    } else { tooltip.style.opacity = '0'; }
  };
  canvas.onmouseleave = () => tooltip.style.opacity = '0';
}

function init3DTilt() {
  document.querySelectorAll('.card-3d').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect(), centerX = rect.width / 2, centerY = rect.height / 2;
      card.style.transform = `perspective(1000px) rotateX(${((e.clientY - rect.top - centerY) / centerY) * -5}deg) rotateY(${((e.clientX - rect.left - centerX) / centerX) * 5}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)'; });
  });
}

function initParticleBackground() {
  const canvas = document.getElementById('bg-canvas'), ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth), height = (canvas.height = window.innerHeight);
  window.addEventListener('resize', () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; });
  const particles = Array.from({ length: 45 }, () => ({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.1, speedY: -(Math.random() * 0.3 + 0.1), speedX: (Math.random() - 0.5) * 0.2 }));
  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.y += p.speedY; p.x += p.speedX;
      if (p.y < 0) p.y = height;
      if (p.x < 0 || p.x > width) p.x = Math.random() * width;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 184, 0, ${p.alpha})`; ctx.shadowBlur = 8; ctx.shadowColor = '#E6B800'; ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

document.getElementById('export-btn').addEventListener('click', exportCSV);

document.getElementById('clear-all-btn').addEventListener('click', () => {
  showToast('Reset feature is disabled when connected to database.', 'error');
});

function exportCSV() {
  if (trades.length === 0) return showToast('No trades to export.', 'error');
  const headers = ['ID', 'Entry Date', 'Exit Date', 'Type', 'Lots', 'Entry Price', 'Exit Price', 'Pips', 'Profit Loss', 'Notes'];
  const rows = trades.map(t => [t.id, `"${t.entryDate}"`, `"${t.exitDate}"`, t.direction, t.lotSize, t.entryPrice, t.exitPrice, t.pips, t.profitLoss, `"${(t.notes || '').replace(/"/g, '""')}"`]);
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')));
  link.setAttribute('download', `XAUUSD_Journal_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  showToast('CSV Export generated!', 'success');
}

window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`; toast.innerHTML = `<div>${message}</div>`;
  container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}

window.openModal = function(title, bodyText, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = bodyText;
  document.getElementById('modal-confirm-btn').onclick = () => { onConfirm(); window.closeModal(); };
  document.getElementById('custom-modal').classList.add('active');
}

window.closeModal = function() { document.getElementById('custom-modal').classList.remove('active'); }

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') handleFormSubmit(e);
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportCSV(); }
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('table-search').focus(); }
    if (e.key === 'Escape') { window.closeModal(); window.resetForm(); }
  });
}

// --- LOGOUT FUNCTIONALITY ---
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth).then(() => {
    showToast("Logging out...", "warning");
  }).catch((error) => {
    console.error("Logout Error:", error);
    showToast("Error logging out.", "error");
  });
});

function escapeHTML(str) { return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }
function debounce(func, wait) { let timeout; return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }
