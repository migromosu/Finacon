const STORAGE_KEYS = {
  transactions: "finacon.transactions",
  investments: "finacon.investments",
  watchlist: "finacon.watchlist",
};

const ASSET_COLORS = { crypto: "#f7931a", stock: "#4fc3f7", etf: "#bb86fc" };

const transactions = readFromStorage(STORAGE_KEYS.transactions, []);
const investments = readFromStorage(STORAGE_KEYS.investments, []);
const watchlist = readFromStorage(STORAGE_KEYS.watchlist, []);

const transactionForm = document.getElementById("transactionForm");
const investmentForm = document.getElementById("investmentForm");
const watchlistForm = document.getElementById("watchlistForm");
const refreshPricesBtn = document.getElementById("refreshPricesBtn");
const quickIncomeBtn = document.getElementById("quickIncomeBtn");
const quickExpenseBtn = document.getElementById("quickExpenseBtn");

const txType = document.getElementById("txType");
const txCategory = document.getElementById("txCategory");
const txAmount = document.getElementById("txAmount");

const incomeValue = document.getElementById("incomeValue");
const expenseValue = document.getElementById("expenseValue");
const balanceValue = document.getElementById("balanceValue");
const portfolioValue = document.getElementById("portfolioValue");
const portfolioPnl = document.getElementById("portfolioPnl");
const netWorthValue = document.getElementById("netWorthValue");
const savingsProgress = document.getElementById("savingsProgress");

const marketStatus = document.getElementById("marketStatus");
const marketUpdatedAt = document.getElementById("marketUpdatedAt");

const transactionsBody = document.getElementById("transactionsBody");
const investmentsBody = document.getElementById("investmentsBody");
const watchlistBody = document.getElementById("watchlistBody");

const allocationDonut = document.getElementById("allocationDonut");
const allocationLegend = document.getElementById("allocationLegend");
const allocationLegendText = document.getElementById("allocationLegendText");

const emptyRowTemplate = document.getElementById("emptyRowTemplate");

transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const type = txType.value;
  const category = txCategory.value.trim();
  const amount = Number(txAmount.value);
  if (!category || Number.isNaN(amount) || amount <= 0) return;

  transactions.unshift({
    id: crypto.randomUUID(),
    type,
    category,
    amount,
    createdAt: new Date().toISOString(),
  });

  saveToStorage(STORAGE_KEYS.transactions, transactions);
  transactionForm.reset();
  renderTransactions();
  renderFinanceSummary();
});

investmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const assetClass = document.getElementById("assetClass").value;
  const symbol = document.getElementById("assetSymbol").value.trim().toUpperCase();
  const quantity = Number(document.getElementById("assetQuantity").value);
  const buyPrice = Number(document.getElementById("assetBuyPrice").value);
  if (!symbol || Number.isNaN(quantity) || Number.isNaN(buyPrice) || quantity <= 0 || buyPrice <= 0) return;

  investments.unshift({
    id: crypto.randomUUID(),
    assetClass,
    symbol,
    quantity,
    buyPrice,
    livePrice: null,
    updatedAt: null,
  });

  saveToStorage(STORAGE_KEYS.investments, investments);
  investmentForm.reset();

  await refreshLivePrices();
  renderInvestments();
  renderFinanceSummary();
  renderAllocation();
});

watchlistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const symbolInput = document.getElementById("watchSymbol");
  const classInput = document.getElementById("watchClass");

  const symbol = symbolInput.value.trim().toUpperCase();
  const assetClass = classInput.value;
  if (!symbol) return;

  const existing = watchlist.find((item) => item.symbol === symbol && item.assetClass === assetClass);
  if (existing) return;

  watchlist.unshift({ id: crypto.randomUUID(), symbol, assetClass, price: null });
  saveToStorage(STORAGE_KEYS.watchlist, watchlist);
  watchlistForm.reset();

  await refreshLivePrices();
  renderWatchlist();
});

refreshPricesBtn.addEventListener("click", async () => {
  await refreshLivePrices();
  renderInvestments();
  renderWatchlist();
  renderFinanceSummary();
  renderAllocation();
});

quickIncomeBtn.addEventListener("click", () => {
  txType.value = "income";
  txCategory.value = "Ingreso rápido";
  txAmount.value = "1000";
  txAmount.focus();
});

quickExpenseBtn.addEventListener("click", () => {
  txType.value = "expense";
  txCategory.value = "Gasto rápido";
  txAmount.value = "50";
  txAmount.focus();
});

function renderFinanceSummary() {
  const income = transactions.filter((tx) => tx.type === "income").reduce((acc, tx) => acc + tx.amount, 0);
  const expense = transactions.filter((tx) => tx.type === "expense").reduce((acc, tx) => acc + tx.amount, 0);
  const balance = income - expense;

  const metrics = calculatePortfolioMetrics();

  incomeValue.textContent = formatMoney(income);
  expenseValue.textContent = formatMoney(expense);
  balanceValue.textContent = formatMoney(balance);
  portfolioValue.textContent = formatMoney(metrics.currentValue);
  portfolioPnl.textContent = formatMoney(metrics.pnl);
  portfolioPnl.className = metrics.pnl >= 0 ? "positive" : "negative";
  netWorthValue.textContent = formatMoney(balance + metrics.currentValue);

  const target = Math.max(income * 0.2, 1);
  const progress = clamp((Math.max(balance, 0) / target) * 100, 0, 999);
  savingsProgress.textContent = `${progress.toFixed(0)}%`;
}

function renderTransactions() {
  transactionsBody.innerHTML = "";
  if (!transactions.length) {
    const row = emptyRowTemplate.content.firstElementChild.cloneNode(true);
    row.firstElementChild.colSpan = 4;
    transactionsBody.appendChild(row);
    return;
  }

  for (const tx of transactions.slice(0, 10)) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleDateString("es-ES")}</td>
      <td>${tx.type === "income" ? "Ingreso" : "Gasto"}</td>
      <td>${escapeHtml(tx.category)}</td>
      <td class="${tx.type === "income" ? "positive" : "negative"}">${formatMoney(tx.amount)}</td>
    `;
    transactionsBody.appendChild(row);
  }
}

function renderInvestments() {
  investmentsBody.innerHTML = "";
  if (!investments.length) {
    investmentsBody.appendChild(emptyRowTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  for (const item of investments) {
    const current = Number(item.livePrice ?? item.buyPrice);
    const value = current * item.quantity;
    const cost = item.buyPrice * item.quantity;
    const pnl = value - cost;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="asset-chip ${item.assetClass}">${assetIcon(item.assetClass)} ${escapeHtml(item.symbol)}</span></td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.buyPrice)}</td>
      <td>${formatMoney(current)}</td>
      <td>${formatMoney(value)}</td>
      <td class="${pnl >= 0 ? "positive" : "negative"}">${formatMoney(pnl)}</td>
      <td><button class="btn-danger" data-id="${item.id}">Eliminar</button></td>
    `;
    investmentsBody.appendChild(row);
  }

  investmentsBody.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = investments.findIndex((item) => item.id === btn.dataset.id);
      if (index < 0) return;
      investments.splice(index, 1);
      saveToStorage(STORAGE_KEYS.investments, investments);
      renderInvestments();
      renderFinanceSummary();
      renderAllocation();
    });
  });
}

function renderWatchlist() {
  watchlistBody.innerHTML = "";
  if (!watchlist.length) {
    watchlistBody.innerHTML = "<li class='empty'>Sin símbolos en watchlist.</li>";
    return;
  }

  for (const item of watchlist) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${assetIcon(item.assetClass)} ${escapeHtml(item.symbol)}</span>
      <span>${item.price ? formatMoney(item.price) : "--"}</span>
      <button class="btn-danger" data-watch-id="${item.id}">X</button>
    `;
    watchlistBody.appendChild(li);
  }

  watchlistBody.querySelectorAll("button[data-watch-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = watchlist.findIndex((item) => item.id === btn.dataset.watchId);
      if (index < 0) return;
      watchlist.splice(index, 1);
      saveToStorage(STORAGE_KEYS.watchlist, watchlist);
      renderWatchlist();
    });
  });
}

function renderAllocation() {
  const totals = { crypto: 0, stock: 0, etf: 0 };
  for (const item of investments) {
    const price = Number(item.livePrice ?? item.buyPrice);
    totals[item.assetClass] += price * item.quantity;
  }

  const total = totals.crypto + totals.stock + totals.etf;
  if (total <= 0) {
    allocationLegendText.textContent = "Sin posiciones";
    allocationDonut.style.background = "conic-gradient(#2d3856 0deg 360deg)";
    allocationLegend.innerHTML = "";
    return;
  }

  allocationLegendText.textContent = "Distribución actual";
  const cryptoPct = totals.crypto / total;
  const stockPct = totals.stock / total;
  const etfPct = totals.etf / total;

  const a = cryptoPct * 360;
  const b = a + stockPct * 360;
  allocationDonut.style.background = `conic-gradient(${ASSET_COLORS.crypto} 0deg ${a}deg, ${ASSET_COLORS.stock} ${a}deg ${b}deg, ${ASSET_COLORS.etf} ${b}deg 360deg)`;

  allocationLegend.innerHTML = [
    legendItem("Crypto", totals.crypto, cryptoPct, ASSET_COLORS.crypto),
    legendItem("Acciones", totals.stock, stockPct, ASSET_COLORS.stock),
    legendItem("ETF", totals.etf, etfPct, ASSET_COLORS.etf),
  ].join("");
}

function legendItem(name, value, pct, color) {
  return `<li><span><span class="legend-dot" style="background:${color}"></span>${name}</span><strong>${formatMoney(value)} · ${formatPercent(pct)}</strong></li>`;
}

function calculatePortfolioMetrics() {
  const currentValue = investments.reduce((acc, item) => acc + Number(item.livePrice ?? item.buyPrice) * item.quantity, 0);
  const cost = investments.reduce((acc, item) => acc + item.buyPrice * item.quantity, 0);
  return { currentValue, cost, pnl: currentValue - cost };
}

async function refreshLivePrices() {
  marketStatus.textContent = "Sincronizando mercado";
  refreshPricesBtn.disabled = true;

  try {
    await Promise.all([refreshInvestmentPrices(), refreshWatchlistPrices()]);
    marketStatus.textContent = "Mercado actualizado";
    marketUpdatedAt.textContent = new Date().toLocaleString("es-ES");

    saveToStorage(STORAGE_KEYS.investments, investments);
    saveToStorage(STORAGE_KEYS.watchlist, watchlist);
  } catch {
    marketStatus.textContent = "Modo degradado (sin conexión APIs)";
  } finally {
    refreshPricesBtn.disabled = false;
  }
}

async function refreshInvestmentPrices() {
  const cryptoAssets = investments.filter((item) => item.assetClass === "crypto");
  const marketAssets = investments.filter((item) => item.assetClass !== "crypto");
  await updateCryptoPrices(cryptoAssets);
  await updateMarketPrices(marketAssets);
}

async function refreshWatchlistPrices() {
  const crypto = watchlist.filter((item) => item.assetClass === "crypto");
  const market = watchlist.filter((item) => item.assetClass !== "crypto");

  await updateCryptoPrices(crypto, true);
  await updateMarketPrices(market, true);
}

async function updateCryptoPrices(items, isWatchlist = false) {
  const ids = [...new Set(items.map((item) => mapCryptoSymbolToGeckoId(item.symbol)).filter(Boolean))];
  if (!ids.length) return;

  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd`);
  if (!response.ok) return;
  const data = await response.json();

  for (const item of items) {
    const id = mapCryptoSymbolToGeckoId(item.symbol);
    const price = data?.[id]?.usd;
    if (typeof price !== "number") continue;
    if (isWatchlist) item.price = price;
    else {
      item.livePrice = price;
      item.updatedAt = new Date().toISOString();
    }
  }
}

async function updateMarketPrices(items, isWatchlist = false) {
  const symbols = [...new Set(items.map((item) => item.symbol))];
  if (!symbols.length) return;

  const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(","))}?apikey=demo`);
  if (!response.ok) return;
  const data = await response.json();

  for (const item of items) {
    const quote = data.find((row) => row.symbol?.toUpperCase() === item.symbol);
    if (!quote?.price) continue;
    if (isWatchlist) item.price = Number(quote.price);
    else {
      item.livePrice = Number(quote.price);
      item.updatedAt = new Date().toISOString();
    }
  }
}

function mapCryptoSymbolToGeckoId(symbol) {
  const mapper = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    ADA: "cardano",
    XRP: "ripple",
    BNB: "binancecoin",
    AVAX: "avalanche-2",
    DOGE: "dogecoin",
    LINK: "chainlink",
  };
  return mapper[symbol.toUpperCase()] || null;
}

function assetIcon(assetClass) {
  if (assetClass === "crypto") return "🪙";
  if (assetClass === "etf") return "📊";
  return "🏢";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);
}

function formatPercent(value) {
  return new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value || 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

(async function init() {
  renderTransactions();
  renderInvestments();
  renderWatchlist();
  renderFinanceSummary();
  renderAllocation();
  await refreshLivePrices();
  renderInvestments();
  renderWatchlist();
  renderFinanceSummary();
  renderAllocation();
})();
