const STORAGE_KEYS = {
  transactions: "finacon.transactions",
  investments: "finacon.investments",
};

const transactions = readFromStorage(STORAGE_KEYS.transactions, []);
const investments = readFromStorage(STORAGE_KEYS.investments, []);

const transactionForm = document.getElementById("transactionForm");
const transactionsBody = document.getElementById("transactionsBody");
const incomeValue = document.getElementById("incomeValue");
const expenseValue = document.getElementById("expenseValue");
const balanceValue = document.getElementById("balanceValue");

const investmentForm = document.getElementById("investmentForm");
const investmentsBody = document.getElementById("investmentsBody");
const refreshPricesBtn = document.getElementById("refreshPricesBtn");
const emptyRowTemplate = document.getElementById("emptyRowTemplate");

transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const type = document.getElementById("txType").value;
  const category = document.getElementById("txCategory").value.trim();
  const amount = Number(document.getElementById("txAmount").value);

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
  renderSummary();
});

investmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const assetClass = document.getElementById("assetClass").value;
  const symbol = document.getElementById("assetSymbol").value.trim().toUpperCase();
  const quantity = Number(document.getElementById("assetQuantity").value);
  const buyPrice = Number(document.getElementById("assetBuyPrice").value);

  investments.push({
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
});

refreshPricesBtn.addEventListener("click", async () => {
  refreshPricesBtn.disabled = true;
  refreshPricesBtn.textContent = "Actualizando...";
  try {
    await refreshLivePrices();
    renderInvestments();
  } finally {
    refreshPricesBtn.disabled = false;
    refreshPricesBtn.textContent = "Actualizar precios";
  }
});

function renderSummary() {
  const income = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  incomeValue.textContent = formatMoney(income);
  expenseValue.textContent = formatMoney(expense);
  balanceValue.textContent = formatMoney(income - expense);
}

function renderTransactions() {
  transactionsBody.innerHTML = "";
  if (!transactions.length) {
    const row = emptyRowTemplate.content.firstElementChild.cloneNode(true);
    row.firstElementChild.colSpan = 4;
    transactionsBody.appendChild(row);
    return;
  }

  for (const tx of transactions) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(tx.createdAt).toLocaleDateString("es-ES")}</td>
      <td>${tx.type === "income" ? "Ingreso" : "Gasto"}</td>
      <td>${escapeHtml(tx.category)}</td>
      <td>${formatMoney(tx.amount)}</td>
    `;
    transactionsBody.appendChild(tr);
  }
}

function renderInvestments() {
  investmentsBody.innerHTML = "";
  if (!investments.length) {
    investmentsBody.appendChild(emptyRowTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  for (const investment of investments) {
    const currentPrice = Number(investment.livePrice ?? investment.buyPrice);
    const currentValue = currentPrice * investment.quantity;
    const costBasis = investment.buyPrice * investment.quantity;
    const pnl = currentValue - costBasis;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${badge(investment.assetClass)} ${escapeHtml(investment.symbol)}</td>
      <td>${investment.quantity}</td>
      <td>${formatMoney(investment.buyPrice)}</td>
      <td>${formatMoney(currentPrice)}</td>
      <td>${formatMoney(currentValue)}</td>
      <td class="${pnl >= 0 ? "positive" : "negative"}">${formatMoney(pnl)}</td>
      <td><button class="danger-btn" data-id="${investment.id}">Eliminar</button></td>
    `;
    investmentsBody.appendChild(tr);
  }

  investmentsBody.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const index = investments.findIndex((item) => item.id === id);
      if (index >= 0) {
        investments.splice(index, 1);
        saveToStorage(STORAGE_KEYS.investments, investments);
        renderInvestments();
      }
    });
  });
}

async function refreshLivePrices() {
  const cryptoAssets = investments.filter((item) => item.assetClass === "crypto");
  const marketAssets = investments.filter((item) => item.assetClass !== "crypto");

  if (cryptoAssets.length) {
    await updateCryptoPrices(cryptoAssets);
  }

  if (marketAssets.length) {
    await updateMarketPrices(marketAssets);
  }

  saveToStorage(STORAGE_KEYS.investments, investments);
}

async function updateCryptoPrices(assets) {
  const ids = assets.map((asset) => mapCryptoSymbolToGeckoId(asset.symbol)).filter(Boolean);
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) {
    return;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniqueIds.join(","))}&vs_currencies=usd`;
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  for (const asset of assets) {
    const geckoId = mapCryptoSymbolToGeckoId(asset.symbol);
    const price = data?.[geckoId]?.usd;
    if (typeof price === "number") {
      asset.livePrice = price;
      asset.updatedAt = new Date().toISOString();
    }
  }
}

async function updateMarketPrices(assets) {
  const symbols = [...new Set(assets.map((asset) => asset.symbol))];
  if (!symbols.length) {
    return;
  }

  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(","))}?apikey=demo`;
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  for (const asset of assets) {
    const matched = data.find((item) => item.symbol?.toUpperCase() === asset.symbol);
    if (matched?.price) {
      asset.livePrice = Number(matched.price);
      asset.updatedAt = new Date().toISOString();
    }
  }
}

function mapCryptoSymbolToGeckoId(symbol) {
  const mapping = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    ADA: "cardano",
    XRP: "ripple",
    BNB: "binancecoin",
    DOT: "polkadot",
    DOGE: "dogecoin",
  };
  return mapping[symbol.toUpperCase()] || null;
}

function badge(assetClass) {
  if (assetClass === "crypto") return "🪙";
  if (assetClass === "etf") return "📈";
  return "🏢";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
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
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(async function init() {
  renderSummary();
  renderTransactions();
  renderInvestments();
  await refreshLivePrices();
  renderInvestments();
})();
