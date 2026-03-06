/* ============================================================
   FINACON — App Logic
   ============================================================ */

// ── Constants ──────────────────────────────────────────────
const STORAGE_KEY = 'finacon.v3';

const ACCOUNT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#10b981','#3b82f6',
  '#f59e0b','#ef4444','#14b8a6','#f97316','#06b6d4',
];

const ACCOUNT_TYPES = {
  bank:       { label: 'Banco',     icon: '🏦' },
  cash:       { label: 'Efectivo',  icon: '💵' },
  credit:     { label: 'Credito',   icon: '💳' },
  savings:    { label: 'Ahorro',    icon: '🏆' },
  investment: { label: 'Inversion', icon: '📈' },
  crypto:     { label: 'Crypto',    icon: '🪙' },
};

const DEFAULT_CATEGORIES = [
  // Expenses
  { id: 'c-food',   name: 'Comida',        icon: '🍕', color: '#f97316', type: 'expense' },
  { id: 'c-home',   name: 'Casa',          icon: '🏠', color: '#3b82f6', type: 'expense' },
  { id: 'c-trans',  name: 'Transporte',    icon: '🚗', color: '#6366f1', type: 'expense' },
  { id: 'c-fun',    name: 'Ocio',          icon: '🎬', color: '#ec4899', type: 'expense' },
  { id: 'c-shop',   name: 'Compras',       icon: '🛒', color: '#f43f5e', type: 'expense' },
  { id: 'c-health', name: 'Salud',         icon: '💊', color: '#10b981', type: 'expense' },
  { id: 'c-edu',    name: 'Educacion',     icon: '📚', color: '#a78bfa', type: 'expense' },
  { id: 'c-fin',    name: 'Finanzas',      icon: '💰', color: '#fbbf24', type: 'expense' },
  { id: 'c-travel', name: 'Viajes',        icon: '✈️', color: '#38bdf8', type: 'expense' },
  { id: 'c-cloth',  name: 'Ropa',          icon: '👕', color: '#fb7185', type: 'expense' },
  { id: 'c-pets',   name: 'Mascotas',      icon: '🐾', color: '#a3e635', type: 'expense' },
  { id: 'c-gifts',  name: 'Regalos',       icon: '🎁', color: '#f472b6', type: 'expense' },
  { id: 'c-subs',   name: 'Suscripciones', icon: '📱', color: '#818cf8', type: 'expense' },
  { id: 'c-other',  name: 'Otros',         icon: '📋', color: '#64748b', type: 'expense' },
  // Income
  { id: 'c-sal',    name: 'Salario',       icon: '💼', color: '#10b981', type: 'income' },
  { id: 'c-free',   name: 'Freelance',     icon: '💻', color: '#06b6d4', type: 'income' },
  { id: 'c-inv',    name: 'Inversiones',   icon: '📈', color: '#fbbf24', type: 'income' },
  { id: 'c-bonus',  name: 'Bono',          icon: '🎉', color: '#f472b6', type: 'income' },
  { id: 'c-rent',   name: 'Alquiler',      icon: '🏘️', color: '#f97316', type: 'income' },
  { id: 'c-oinc',   name: 'Otros ingresos',icon: '💸', color: '#64748b', type: 'income' },
];

// ── State ──────────────────────────────────────────────────
let S = loadState();

// View state
let currentSection  = 'dashboard';
let dashMonth       = new Date();
let reportPeriod    = 'month';
let reportDate      = new Date();

// Modal state
let txType          = 'expense';
let selectedCatId   = null;
let selectedColor   = ACCOUNT_COLORS[0];

// Chart instances
let chartDonut = null, chartBar = null, chartRDonut = null;

// ── Persistence ────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.categories?.length) s.categories = DEFAULT_CATEGORIES;
    if (!s.settings) s.settings = { currency: 'USD' };
    if (!s.budgets) s.budgets = [];
    return s;
  } catch { return defaultState(); }
}

function defaultState() {
  return {
    accounts: [{
      id: uid(), name: 'Mi cuenta', type: 'bank',
      initialBalance: 0, color: ACCOUNT_COLORS[0],
      createdAt: now(),
    }],
    transactions: [],
    categories:   DEFAULT_CATEGORIES,
    budgets:      [],
    settings:     { currency: 'USD' },
  };
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }

// ── Utils ──────────────────────────────────────────────────
function uid() { return (crypto.randomUUID ?? (() => Math.random().toString(36).slice(2)))(); }
function now() { return new Date().toISOString(); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function fmt(v) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: S.settings.currency || 'USD',
    minimumFractionDigits: 2,
  }).format(v || 0);
}

function fmtCompact(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return fmt(v / 1e6).replace(/[\d,.]+/, n => n + 'M');
  if (abs >= 1e3) return fmt(v / 1e3).replace(/[\d,.]+/, n => n + 'K');
  return fmt(v);
}

function monthLabel(d) {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function dateLabel(iso) {
  const d   = new Date(iso);
  const now = new Date();
  const yes = new Date(); yes.setDate(yes.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Hoy';
  if (d.toDateString() === yes.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function rgba(hex, a) {
  const n = parseInt(hex.replace('#',''), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

function darken(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, ((n>>16)&255) - amt);
  const g = Math.max(0, ((n>>8)&255)  - amt);
  const b = Math.max(0, (n&255)       - amt);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function getCat(id)    { return S.categories.find(c => c.id === id); }
function getAccount(id){ return S.accounts.find(a => a.id === id);   }

function accountBalance(id) {
  const acc = getAccount(id);
  if (!acc) return 0;
  let bal = acc.initialBalance || 0;
  for (const tx of S.transactions) {
    if (tx.type === 'income'   && tx.accountId === id)   bal += tx.amount;
    if (tx.type === 'expense'  && tx.accountId === id)   bal -= tx.amount;
    if (tx.type === 'transfer' && tx.accountId === id)   bal -= tx.amount;
    if (tx.type === 'transfer' && tx.toAccountId === id) bal += tx.amount;
  }
  return bal;
}

function totalBalance() { return S.accounts.reduce((s, a) => s + accountBalance(a.id), 0); }

function txsForMonth(d) {
  const y = d.getFullYear(), m = d.getMonth();
  return S.transactions.filter(tx => {
    const td = new Date(tx.date);
    return td.getFullYear() === y && td.getMonth() === m;
  });
}

function txsForYear(d) {
  return S.transactions.filter(tx => new Date(tx.date).getFullYear() === d.getFullYear());
}

// ── Navigation ─────────────────────────────────────────────
function navigate(section) {
  document.querySelectorAll('.section').forEach(s  => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById(`section-${section}`);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-section="${section}"]`).forEach(n => n.classList.add('active'));

  currentSection = section;
  closeMobileMenu();

  const renders = {
    dashboard:    renderDashboard,
    transactions: renderTransactions,
    accounts:     renderAccounts,
    budgets:      renderBudgets,
    reports:      renderReports,
    settings:     renderSettings,
  };
  renders[section]?.();
  renderSidebar();
}

// ── Sidebar ────────────────────────────────────────────────
function renderSidebar() {
  const el = document.getElementById('sidebarAccountsList');
  if (!S.accounts.length) { el.innerHTML = ''; return; }
  el.innerHTML = S.accounts.map(a => `
    <div class="sb-account" data-section="accounts">
      <span class="sb-dot" style="background:${a.color}"></span>
      <span class="sb-name">${esc(a.name)}</span>
      <span class="sb-bal">${fmtCompact(accountBalance(a.id))}</span>
    </div>
  `).join('');
  el.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.section));
  });
}

// ── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  const txs     = txsForMonth(dashMonth);
  const income  = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const total   = totalBalance();

  document.getElementById('dashboardPeriodLabel').textContent = monthLabel(dashMonth);

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card kpi-total">
      <div class="kpi-label">Patrimonio total</div>
      <div class="kpi-amount">${fmt(total)}</div>
      <div class="kpi-sub">${S.accounts.length} cuenta${S.accounts.length !== 1 ? 's' : ''}</div>
      <div class="kpi-icon">💎</div>
    </div>
    <div class="kpi-card kpi-income">
      <div class="kpi-label">Ingresos del mes</div>
      <div class="kpi-amount">${fmt(income)}</div>
      <div class="kpi-sub">${txs.filter(t => t.type === 'income').length} transacciones</div>
      <div class="kpi-icon">↑</div>
    </div>
    <div class="kpi-card kpi-expense">
      <div class="kpi-label">Gastos del mes</div>
      <div class="kpi-amount">${fmt(expense)}</div>
      <div class="kpi-sub">${txs.filter(t => t.type === 'expense').length} transacciones</div>
      <div class="kpi-icon">↓</div>
    </div>
  `;

  renderDashDonut(txs);
  renderRecentTx();
  renderDashBudgets(txs);
}

function renderDashDonut(txs) {
  const expenses = txs.filter(t => t.type === 'expense');
  const byCat = {};
  expenses.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
  const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0, 7);
  const total  = sorted.reduce((s,[,v]) => s + v, 0);

  const canvas = document.getElementById('donutChart');
  const legend = document.getElementById('donutLegend');
  const center = document.getElementById('donutCenter');

  if (chartDonut) { chartDonut.destroy(); chartDonut = null; }

  if (!sorted.length) {
    canvas.style.visibility = 'hidden';
    legend.innerHTML = '<li class="text-muted" style="font-size:0.83rem;">Sin gastos este mes</li>';
    center.innerHTML = '';
    return;
  }

  canvas.style.visibility = 'visible';
  const labels = sorted.map(([id]) => getCat(id)?.name || 'Otros');
  const data   = sorted.map(([,v]) => v);
  const colors = sorted.map(([id]) => getCat(id)?.color || '#64748b');

  chartDonut = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
    options: {
      cutout: '72%',
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` } },
      },
    },
  });

  center.innerHTML = `
    <div class="donut-total-label">Total</div>
    <div class="donut-total-val">${fmtCompact(total)}</div>
  `;

  legend.innerHTML = sorted.map(([id, amount]) => {
    const cat = getCat(id);
    const pct = total ? ((amount / total) * 100).toFixed(0) : 0;
    return `<li>
      <span class="dl-dot" style="background:${cat?.color || '#64748b'}"></span>
      <span class="dl-name">${esc(cat?.name || 'Otros')}</span>
      <span class="dl-amt">${fmt(amount)}</span>
      <span class="dl-pct">${pct}%</span>
    </li>`;
  }).join('');
}

function renderRecentTx() {
  const el   = document.getElementById('recentTxList');
  const txs  = [...S.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  if (!txs.length) {
    el.innerHTML = emptyState('📭', 'Sin transacciones aun');
    return;
  }
  el.innerHTML = `<div class="tx-list-card">${txs.map(tx => txRowHtml(tx, false)).join('')}</div>`;
}

function renderDashBudgets(txs) {
  const el       = document.getElementById('dashBudgetList');
  const expenses = txs.filter(t => t.type === 'expense');
  if (!S.budgets.length) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem 0;">
      <div class="empty-text">Sin presupuestos. <button class="btn-link" data-section="budgets">Crear uno</button></div>
    </div>`;
    el.querySelector('[data-section]')?.addEventListener('click', e => navigate(e.target.dataset.section));
    return;
  }
  el.innerHTML = S.budgets.slice(0, 5).map(b => {
    const cat   = getCat(b.categoryId);
    const spent = expenses.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
    const pct   = b.amount ? clamp((spent / b.amount) * 100, 0, 100) : 0;
    const over  = spent > b.amount;
    const color = over ? 'var(--red)' : pct > 75 ? 'var(--amber)' : 'var(--green)';
    return `
      <div style="display:flex;flex-direction:column;gap:0.4rem;padding:0.6rem 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:0.6rem;">
          <span>${cat?.icon || '📋'}</span>
          <span style="flex:1;font-size:0.875rem;font-weight:500;">${esc(cat?.name || 'Cat')}</span>
          <span style="font-size:0.8rem;color:${color};font-weight:600;">${fmt(spent)} / ${fmt(b.amount)}</span>
        </div>
        <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
  }).join('');
}

// ── TRANSACTIONS ───────────────────────────────────────────
function renderTransactions() {
  // Populate account filter
  const accFilter = document.getElementById('txAccountFilter');
  accFilter.innerHTML = '<option value="">Todas las cuentas</option>' +
    S.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');

  // Default month
  const mInput = document.getElementById('txMonthFilter');
  if (!mInput.value) {
    const d = new Date();
    mInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  applyTxFilters();
}

function applyTxFilters() {
  const [yr, mo] = document.getElementById('txMonthFilter').value.split('-').map(Number);
  const accId    = document.getElementById('txAccountFilter').value;
  const type     = document.getElementById('txTypeFilter').value;

  let txs = txsForMonth(new Date(yr, mo - 1, 1));
  if (accId) txs = txs.filter(t => t.accountId === accId || t.toAccountId === accId);
  if (type)  txs = txs.filter(t => t.type === type);
  txs.sort((a,b) => new Date(b.date) - new Date(a.date));

  const el = document.getElementById('txGroupedList');
  if (!txs.length) {
    el.innerHTML = emptyState('🔍', 'Sin transacciones para este periodo');
    return;
  }

  // Group by date
  const groups = {};
  txs.forEach(tx => {
    const k = tx.date.slice(0, 10);
    (groups[k] = groups[k] || []).push(tx);
  });

  el.innerHTML = Object.entries(groups)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => {
      const dayNet = list.reduce((s,t) => {
        if (t.type === 'income')  return s + t.amount;
        if (t.type === 'expense') return s - t.amount;
        return s;
      }, 0);
      const cls = dayNet >= 0 ? 'pos' : 'neg';
      return `
        <div class="tx-group">
          <div class="tx-group-header">
            <span class="tx-group-date">${dateLabel(date)}</span>
            <span class="tx-group-total ${cls}">${dayNet >= 0 ? '+' : ''}${fmt(dayNet)}</span>
          </div>
          <div class="tx-list-card">${list.map(t => txRowHtml(t, true)).join('')}</div>
        </div>`;
    }).join('');

  // Attach action listeners
  el.querySelectorAll('[data-edit-tx]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); openEditTx(b.dataset.editTx); });
  });
  el.querySelectorAll('[data-del-tx]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); deleteTx(b.dataset.delTx); });
  });
}

function txRowHtml(tx, showActions) {
  const cat      = getCat(tx.categoryId);
  const acc      = getAccount(tx.accountId);
  const toAcc    = tx.toAccountId ? getAccount(tx.toAccountId) : null;
  const iconBg   = tx.type === 'transfer' ? '#3b82f6' : (cat?.color || '#64748b');
  const icon     = tx.type === 'transfer' ? '↔' : (cat?.icon || '📋');
  const catName  = tx.type === 'transfer' ? `${acc?.name || '?'} → ${toAcc?.name || '?'}` : (cat?.name || 'Sin categoria');
  const note     = tx.note ? esc(tx.note) : esc(acc?.name || '');
  const sign     = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
  const amtClass = tx.type;

  const actions = showActions ? `
    <div class="tx-row-actions">
      <button class="btn-icon btn-xs" data-edit-tx="${tx.id}" title="Editar">✏️</button>
      <button class="btn-icon btn-xs" style="color:var(--red2)" data-del-tx="${tx.id}" title="Eliminar">🗑️</button>
    </div>` : '';

  return `
    <div class="tx-row">
      <div class="tx-icon-wrap" style="background:${rgba(iconBg, 0.15)}">${icon}</div>
      <div class="tx-info">
        <div class="tx-name">${esc(catName)}</div>
        <div class="tx-meta">${note}</div>
      </div>
      ${actions}
      <div class="tx-right">
        <span class="tx-amount ${amtClass}">${sign}${fmt(tx.amount)}</span>
      </div>
    </div>`;
}

function deleteTx(id) {
  if (!confirm('¿Eliminar esta transaccion?')) return;
  S.transactions = S.transactions.filter(t => t.id !== id);
  save();
  if (currentSection === 'transactions') applyTxFilters();
  else renderDashboard();
  renderSidebar();
}

// ── ACCOUNTS ───────────────────────────────────────────────
function renderAccounts() {
  const el    = document.getElementById('accountsContent');
  const total = totalBalance();

  el.innerHTML = `
    <div class="accounts-summary">
      <div class="accounts-summary-label">Patrimonio total</div>
      <div class="accounts-summary-total">${fmt(total)}</div>
      <div class="accounts-summary-sub">${S.accounts.length} cuenta${S.accounts.length !== 1 ? 's' : ''} activa${S.accounts.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="accounts-grid" id="accountsGrid"></div>`;

  const grid = document.getElementById('accountsGrid');
  grid.innerHTML = S.accounts.map(a => accountCardHtml(a)).join('') + `
    <div class="add-account-card" id="addAccountCard">
      <span style="font-size:1.4rem;">+</span> Nueva cuenta
    </div>`;

  grid.querySelectorAll('[data-edit-acc]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); openEditAccount(b.dataset.editAcc); });
  });
  grid.querySelectorAll('[data-del-acc]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); deleteAccount(b.dataset.delAcc); });
  });
  document.getElementById('addAccountCard').addEventListener('click', openAddAccount);
}

function accountCardHtml(a) {
  const bal  = accountBalance(a.id);
  const type = ACCOUNT_TYPES[a.type] || ACCOUNT_TYPES.bank;
  return `
    <div class="account-card" style="background:linear-gradient(135deg,${a.color},${darken(a.color,30)})">
      <div class="ac-type-row">
        <div class="ac-type-badge">${type.icon} ${type.label}</div>
        <div class="ac-actions">
          <button class="ac-btn" data-edit-acc="${a.id}">✏️</button>
          <button class="ac-btn danger" data-del-acc="${a.id}">🗑️</button>
        </div>
      </div>
      <div class="ac-name">${esc(a.name)}</div>
      <div class="ac-balance">${fmt(bal)}</div>
      <div class="ac-bg-icon">${type.icon}</div>
    </div>`;
}

function deleteAccount(id) {
  const hasTxs = S.transactions.some(t => t.accountId === id || t.toAccountId === id);
  const msg    = hasTxs
    ? 'Esta cuenta tiene transacciones. ¿Eliminarla de todos modos?'
    : '¿Eliminar esta cuenta?';
  if (!confirm(msg)) return;
  S.accounts     = S.accounts.filter(a => a.id !== id);
  S.transactions = S.transactions.filter(t => t.accountId !== id && t.toAccountId !== id);
  save();
  renderAccounts();
  renderSidebar();
}

// ── BUDGETS ────────────────────────────────────────────────
function renderBudgets() {
  document.getElementById('budgetPeriodLabel').textContent = monthLabel(new Date());
  const txs     = txsForMonth(new Date());
  const expenses = txs.filter(t => t.type === 'expense');

  const totalSpent   = expenses.reduce((s,t) => s + t.amount, 0);
  const totalBudget  = S.budgets.reduce((s,b) => s + b.amount, 0);
  const remaining    = Math.max(0, totalBudget - totalSpent);

  const el = document.getElementById('budgetsContent');

  if (!S.budgets.length) {
    el.innerHTML = emptyState('🎯', 'Sin presupuestos. Crea uno con el boton de arriba.');
    return;
  }

  el.innerHTML = `
    <div class="budget-summary-row">
      <div class="budget-stat">
        <div class="budget-stat-label">Presupuestado</div>
        <div class="budget-stat-val" style="color:var(--primary2)">${fmt(totalBudget)}</div>
      </div>
      <div class="budget-stat">
        <div class="budget-stat-label">Gastado</div>
        <div class="budget-stat-val" style="color:var(--red2)">${fmt(totalSpent)}</div>
      </div>
      <div class="budget-stat">
        <div class="budget-stat-label">Disponible</div>
        <div class="budget-stat-val" style="color:var(--green2)">${fmt(remaining)}</div>
      </div>
    </div>
    <div class="budget-items-grid">
      ${S.budgets.map(b => budgetItemHtml(b, expenses)).join('')}
    </div>`;

  el.querySelectorAll('[data-del-budget]').forEach(b => {
    b.addEventListener('click', () => {
      S.budgets = S.budgets.filter(x => x.id !== b.dataset.delBudget);
      save();
      renderBudgets();
    });
  });
}

function budgetItemHtml(b, expenses) {
  const cat   = getCat(b.categoryId);
  const spent = expenses.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
  const pct   = b.amount ? clamp((spent / b.amount) * 100, 0, 100) : 0;
  const over  = spent > b.amount;
  const color = over ? 'var(--red)' : pct > 75 ? 'var(--amber)' : 'var(--green)';
  return `
    <div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-cat-icon">${cat?.icon || '📋'}</span>
        <span class="budget-cat-name">${esc(cat?.name || 'Categoria')}</span>
        <span class="budget-amounts" style="color:${color}">${fmt(spent)} / ${fmt(b.amount)}</span>
        <button class="budget-del" data-del-budget="${b.id}" title="Eliminar">✕</button>
      </div>
      <div class="budget-bar-track">
        <div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="budget-pct-row">
        <span>${over ? '⚠️ Superado en ' + fmt(spent - b.amount) : pct.toFixed(0) + '% utilizado'}</span>
        <span>${fmt(b.amount - spent)} restante</span>
      </div>
    </div>`;
}

// ── REPORTS ────────────────────────────────────────────────
function renderReports() {
  const isMonth = reportPeriod === 'month';
  document.getElementById('reportPeriodLabel').textContent =
    isMonth ? monthLabel(reportDate) : reportDate.getFullYear().toString();

  document.querySelectorAll('.period-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.rperiod === reportPeriod));

  const txs     = isMonth ? txsForMonth(reportDate) : txsForYear(reportDate);
  const income  = txs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
  const balance = income - expense;

  document.getElementById('reportKpiRow').innerHTML = `
    <div class="report-kpi">
      <div class="report-kpi-label">Ingresos</div>
      <div class="report-kpi-val green">${fmt(income)}</div>
    </div>
    <div class="report-kpi">
      <div class="report-kpi-label">Gastos</div>
      <div class="report-kpi-val red">${fmt(expense)}</div>
    </div>
    <div class="report-kpi">
      <div class="report-kpi-label">Balance</div>
      <div class="report-kpi-val ${balance >= 0 ? 'green' : 'red'}">${fmt(balance)}</div>
    </div>`;

  renderBarChart(isMonth);
  renderReportDonut(txs);
  renderTopCats(txs);
}

function renderBarChart(isMonth) {
  if (chartBar) { chartBar.destroy(); chartBar = null; }
  const canvas = document.getElementById('barChart');

  let labels, incomeData, expenseData;
  const y = reportDate.getFullYear(), m = reportDate.getMonth();

  if (isMonth) {
    const days = new Date(y, m+1, 0).getDate();
    labels      = Array.from({length: days}, (_,i) => i+1);
    incomeData  = labels.map(d => S.transactions.filter(t => {
      const td = new Date(t.date);
      return t.type === 'income' && td.getFullYear() === y && td.getMonth() === m && td.getDate() === d;
    }).reduce((s,t) => s+t.amount, 0));
    expenseData = labels.map(d => S.transactions.filter(t => {
      const td = new Date(t.date);
      return t.type === 'expense' && td.getFullYear() === y && td.getMonth() === m && td.getDate() === d;
    }).reduce((s,t) => s+t.amount, 0));
  } else {
    labels      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    incomeData  = labels.map((_,mo) => S.transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && d.getFullYear() === y && d.getMonth() === mo;
    }).reduce((s,t) => s+t.amount, 0));
    expenseData = labels.map((_,mo) => S.transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === y && d.getMonth() === mo;
    }).reduce((s,t) => s+t.amount, 0));
  }

  chartBar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ingresos', data: incomeData,  backgroundColor: 'rgba(16,185,129,0.65)', borderRadius: 5 },
        { label: 'Gastos',   data: expenseData, backgroundColor: 'rgba(239,68,68,0.65)',  borderRadius: 5 },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: v => fmtCompact(v) } },
      },
      plugins: {
        legend: { labels: { color: '#a8b8d8', boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } },
      },
    },
  });
}

function renderReportDonut(txs) {
  if (chartRDonut) { chartRDonut.destroy(); chartRDonut = null; }
  const canvas   = document.getElementById('reportDonutChart');
  const expenses = txs.filter(t => t.type === 'expense');
  const byCat    = {};
  expenses.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
  const sorted   = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  if (!sorted.length) return;
  chartRDonut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels:   sorted.map(([id]) => getCat(id)?.name || 'Otros'),
      datasets: [{ data: sorted.map(([,v]) => v), backgroundColor: sorted.map(([id]) => getCat(id)?.color || '#64748b'), borderWidth: 0, hoverOffset: 5 }],
    },
    options: {
      cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { color: '#a8b8d8', font: { size: 11 }, boxWidth: 11 } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` } },
      },
    },
  });
}

function renderTopCats(txs) {
  const expenses = txs.filter(t => t.type === 'expense');
  const byCat    = {};
  expenses.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
  const total  = Object.values(byCat).reduce((s,v) => s+v, 0);
  const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0,10);
  const el     = document.getElementById('topCatList');
  if (!sorted.length) { el.innerHTML = emptyState('📊', 'Sin datos'); return; }
  el.innerHTML = sorted.map(([id, amount]) => {
    const cat = getCat(id);
    const pct = total ? (amount / total) * 100 : 0;
    return `
      <div class="top-cat-row">
        <span class="top-cat-icon">${cat?.icon || '📋'}</span>
        <span class="top-cat-name">${esc(cat?.name || 'Otros')}</span>
        <div class="top-cat-bar-wrap">
          <div class="top-cat-bar" style="width:${pct}%;background:${cat?.color || '#64748b'}"></div>
        </div>
        <span class="top-cat-amt">${fmt(amount)}</span>
        <span class="top-cat-pct">${pct.toFixed(0)}%</span>
      </div>`;
  }).join('');
}

// ── SETTINGS ───────────────────────────────────────────────
function renderSettings() {
  document.getElementById('currencySelect').value = S.settings.currency || 'USD';

  const expCats = S.categories.filter(c => c.type === 'expense');
  const incCats = S.categories.filter(c => c.type === 'income');

  document.getElementById('expenseCatDisplay').innerHTML =
    expCats.map(c => `<div class="cat-chip" style="background:${rgba(c.color,0.15)};color:${c.color}">${c.icon} ${esc(c.name)}</div>`).join('');
  document.getElementById('incomeCatDisplay').innerHTML =
    incCats.map(c => `<div class="cat-chip" style="background:${rgba(c.color,0.15)};color:${c.color}">${c.icon} ${esc(c.name)}</div>`).join('');
}

// ── MODAL: TRANSACTION ─────────────────────────────────────
function openAddTx(preType) {
  txType        = preType || 'expense';
  selectedCatId = null;
  document.getElementById('txEditId').value   = '';
  document.getElementById('txAmount').value   = '';
  document.getElementById('txNote').value     = '';
  document.getElementById('txDate').value     = todayStr();
  document.getElementById('txModalTitle').textContent = 'Nueva transaccion';
  buildTxTypeUI();
  populateAccountSelects();
  openOverlay('overlayTx');
}

function openEditTx(id) {
  const tx = S.transactions.find(t => t.id === id);
  if (!tx) return;
  txType        = tx.type;
  selectedCatId = tx.categoryId;
  document.getElementById('txEditId').value   = id;
  document.getElementById('txAmount').value   = tx.amount;
  document.getElementById('txNote').value     = tx.note || '';
  document.getElementById('txDate').value     = tx.date.slice(0, 10);
  document.getElementById('txModalTitle').textContent = 'Editar transaccion';
  buildTxTypeUI();
  populateAccountSelects(tx.accountId, tx.toAccountId);
  openOverlay('overlayTx');
}

function buildTxTypeUI() {
  document.querySelectorAll('.type-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.type === txType));

  const isTransfer = txType === 'transfer';
  document.getElementById('txCatGroup').style.display     = isTransfer ? 'none' : '';
  document.getElementById('txToAccountGroup').style.display = isTransfer ? '' : 'none';

  if (!isTransfer) buildCatPicker();
}

function buildCatPicker() {
  const cats   = S.categories.filter(c => c.type === (txType === 'income' ? 'income' : 'expense'));
  const picker = document.getElementById('catPicker');
  picker.innerHTML = cats.map(c => `
    <div class="cat-opt ${selectedCatId === c.id ? 'selected' : ''}" data-cat="${c.id}"
         style="background:${selectedCatId === c.id ? rgba(c.color, 0.2) : ''}">
      <span class="cat-opt-icon">${c.icon}</span>
      <span>${esc(c.name)}</span>
    </div>`).join('');
  picker.querySelectorAll('[data-cat]').forEach(el => {
    el.addEventListener('click', () => {
      selectedCatId = el.dataset.cat;
      buildCatPicker();
    });
  });
}

function populateAccountSelects(selId, selToId) {
  const opts = S.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
  document.getElementById('txAccount').innerHTML   = opts;
  document.getElementById('txToAccount').innerHTML = opts;
  if (selId)   document.getElementById('txAccount').value   = selId;
  if (selToId) document.getElementById('txToAccount').value = selToId;
}

function saveTx() {
  const id        = document.getElementById('txEditId').value;
  const amount    = parseFloat(document.getElementById('txAmount').value);
  const accountId = document.getElementById('txAccount').value;
  const toAccId   = document.getElementById('txToAccount').value;
  const date      = document.getElementById('txDate').value;
  const note      = document.getElementById('txNote').value.trim();

  if (!amount || amount <= 0)    { alert('Ingresa un monto valido.'); return; }
  if (!date)                      { alert('Selecciona una fecha.'); return; }
  if (txType !== 'transfer' && !selectedCatId) { alert('Selecciona una categoria.'); return; }
  if (txType === 'transfer' && accountId === toAccId) { alert('Las cuentas deben ser diferentes.'); return; }

  const tx = {
    id:          id || uid(),
    type:        txType,
    amount,
    accountId,
    toAccountId: txType === 'transfer' ? toAccId : null,
    categoryId:  txType === 'transfer' ? null : selectedCatId,
    date:        new Date(date).toISOString(),
    note,
    createdAt:   id ? (S.transactions.find(t => t.id === id)?.createdAt || now()) : now(),
  };

  if (id) {
    const idx = S.transactions.findIndex(t => t.id === id);
    if (idx >= 0) S.transactions[idx] = tx;
  } else {
    S.transactions.unshift(tx);
  }

  save();
  closeOverlay('overlayTx');

  if (currentSection === 'dashboard')    renderDashboard();
  if (currentSection === 'transactions') applyTxFilters();
  renderSidebar();
}

// ── MODAL: ACCOUNT ─────────────────────────────────────────
function openAddAccount() {
  selectedColor = ACCOUNT_COLORS[0];
  document.getElementById('accountEditId').value  = '';
  document.getElementById('accountName').value    = '';
  document.getElementById('accountType').value    = 'bank';
  document.getElementById('accountBalance').value = '0';
  document.getElementById('accountModalTitle').textContent = 'Nueva cuenta';
  buildColorPicker();
  openOverlay('overlayAccount');
}

function openEditAccount(id) {
  const a = getAccount(id);
  if (!a) return;
  selectedColor = a.color;
  document.getElementById('accountEditId').value  = id;
  document.getElementById('accountName').value    = a.name;
  document.getElementById('accountType').value    = a.type;
  document.getElementById('accountBalance').value = a.initialBalance || 0;
  document.getElementById('accountModalTitle').textContent = 'Editar cuenta';
  buildColorPicker();
  openOverlay('overlayAccount');
}

function buildColorPicker() {
  const el = document.getElementById('colorPicker');
  el.innerHTML = ACCOUNT_COLORS.map(c => `
    <div class="color-swatch ${c === selectedColor ? 'selected' : ''}"
         style="background:${c}" data-color="${c}"></div>`).join('');
  el.querySelectorAll('[data-color]').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedColor = sw.dataset.color;
      buildColorPicker();
    });
  });
}

function saveAccount() {
  const id      = document.getElementById('accountEditId').value;
  const name    = document.getElementById('accountName').value.trim();
  const type    = document.getElementById('accountType').value;
  const initBal = parseFloat(document.getElementById('accountBalance').value) || 0;

  if (!name) { alert('Ingresa un nombre para la cuenta.'); return; }

  const account = {
    id:             id || uid(),
    name, type,
    initialBalance: initBal,
    color:          selectedColor,
    createdAt:      id ? (getAccount(id)?.createdAt || now()) : now(),
  };

  if (id) {
    const idx = S.accounts.findIndex(a => a.id === id);
    if (idx >= 0) S.accounts[idx] = account;
  } else {
    S.accounts.push(account);
  }

  save();
  closeOverlay('overlayAccount');
  renderAccounts();
  renderSidebar();
}

// ── MODAL: BUDGET ──────────────────────────────────────────
function openAddBudget() {
  document.getElementById('budgetEditId').value = '';
  document.getElementById('budgetAmount').value = '';

  const expCats = S.categories.filter(c => c.type === 'expense');
  const usedIds = S.budgets.map(b => b.categoryId);
  const avail   = expCats.filter(c => !usedIds.includes(c.id));

  if (!avail.length) { alert('Ya tienes presupuesto en todas las categorias de gasto.'); return; }

  document.getElementById('budgetCategory').innerHTML =
    avail.map(c => `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join('');

  openOverlay('overlayBudget');
}

function saveBudget() {
  const id       = document.getElementById('budgetEditId').value;
  const catId    = document.getElementById('budgetCategory').value;
  const amount   = parseFloat(document.getElementById('budgetAmount').value);

  if (!amount || amount <= 0) { alert('Ingresa un monto valido.'); return; }

  const budget = { id: id || uid(), categoryId: catId, amount };

  if (id) {
    const idx = S.budgets.findIndex(b => b.id === id);
    if (idx >= 0) S.budgets[idx] = budget;
  } else {
    S.budgets.push(budget);
  }

  save();
  closeOverlay('overlayBudget');
  renderBudgets();
}

// ── OVERLAY HELPERS ────────────────────────────────────────
function openOverlay(id)  { document.getElementById(id).classList.add('open');    }
function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

// ── CSV EXPORT ─────────────────────────────────────────────
function exportCSV() {
  const rows = [['Fecha','Tipo','Categoria','Cuenta','Monto','Nota']];
  for (const tx of S.transactions) {
    rows.push([
      tx.date.slice(0,10),
      tx.type,
      getCat(tx.categoryId)?.name || '',
      getAccount(tx.accountId)?.name || '',
      tx.amount,
      tx.note || '',
    ]);
  }
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'finacon-export.csv';
  a.click();
}

// ── MOBILE MENU ────────────────────────────────────────────
function openMobileMenu() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlay').style.display = 'block';
}
function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  const ov = document.getElementById('sidebarOverlay');
  if (ov) ov.style.display = 'none';
}

// ── EMPTY STATE ────────────────────────────────────────────
function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

// ── INIT ───────────────────────────────────────────────────
function init() {
  // Create mobile sidebar overlay
  const ov = document.createElement('div');
  ov.id = 'sidebarOverlay';
  ov.className = 'sidebar-overlay';
  ov.style.display = 'none';
  ov.addEventListener('click', closeMobileMenu);
  document.body.appendChild(ov);

  // Navigation
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.section));
  });

  // Tx modal
  document.getElementById('addTxBtn').addEventListener('click',  () => openAddTx());
  document.getElementById('addTxBtn2').addEventListener('click', () => openAddTx());
  document.getElementById('mobileAddBtn').addEventListener('click', () => openAddTx());
  document.getElementById('saveTxBtn').addEventListener('click', saveTx);

  document.querySelectorAll('.type-tab').forEach(b => {
    b.addEventListener('click', () => { txType = b.dataset.type; buildTxTypeUI(); });
  });

  // Account modal
  document.getElementById('addAccountBtn').addEventListener('click', openAddAccount);
  document.getElementById('saveAccountBtn').addEventListener('click', saveAccount);

  // Budget modal
  document.getElementById('addBudgetBtn').addEventListener('click', openAddBudget);
  document.getElementById('saveBudgetBtn').addEventListener('click', saveBudget);

  // Overlay close buttons
  document.querySelectorAll('[data-close]').forEach(b => {
    b.addEventListener('click', () => closeOverlay(b.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) closeOverlay(o.id); });
  });

  // Dashboard month nav
  document.getElementById('dashPrevBtn').addEventListener('click', () => {
    dashMonth = new Date(dashMonth.getFullYear(), dashMonth.getMonth() - 1, 1);
    renderDashboard();
  });
  document.getElementById('dashNextBtn').addEventListener('click', () => {
    dashMonth = new Date(dashMonth.getFullYear(), dashMonth.getMonth() + 1, 1);
    renderDashboard();
  });

  // Reports period nav
  document.querySelectorAll('.period-btn').forEach(b => {
    b.addEventListener('click', () => { reportPeriod = b.dataset.rperiod; renderReports(); });
  });
  document.getElementById('reportPrevBtn').addEventListener('click', () => {
    reportDate = reportPeriod === 'month'
      ? new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1)
      : new Date(reportDate.getFullYear() - 1, 0, 1);
    renderReports();
  });
  document.getElementById('reportNextBtn').addEventListener('click', () => {
    reportDate = reportPeriod === 'month'
      ? new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 1)
      : new Date(reportDate.getFullYear() + 1, 0, 1);
    renderReports();
  });

  // Tx filters
  ['txMonthFilter','txAccountFilter','txTypeFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyTxFilters);
  });

  // Settings
  document.getElementById('currencySelect').addEventListener('change', e => {
    S.settings.currency = e.target.value;
    save();
    navigate(currentSection);
  });
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    if (confirm('¿Borrar TODOS los datos? Esta accion no se puede deshacer.')) {
      localStorage.removeItem(STORAGE_KEY);
      S = defaultState();
      navigate('dashboard');
    }
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', openMobileMenu);

  // Initial render
  renderSidebar();
  navigate('dashboard');
}

init();
