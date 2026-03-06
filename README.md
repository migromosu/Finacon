# Finacon

Finacon ahora avanza con una experiencia más cercana a una app tipo Wallet: premium, rápida y enfocada en decisiones.

## Qué incluye esta iteración
- Dashboard wallet-style con:
  - Patrimonio total.
  - KPIs de ingresos, gastos, balance, portfolio y P/L.
  - Progreso de ahorro estimado.
- Gestión de movimientos (ingresos/gastos) con tabla reciente.
- Portfolio de inversiones (crypto, acciones, ETF):
  - alta/baja de posiciones,
  - valor de posición,
  - P/L por posición,
  - actualización de precios de mercado.
- Watchlist de activos con seguimiento de precios.
- Donut de asignación por tipo de activo.

## APIs de precios usadas
- Crypto: CoinGecko.
- Acciones/ETF: Financial Modeling Prep (`apikey=demo`).

## Ejecutar localmente
```bash
python3 -m http.server 4173
```
Abrir: `http://localhost:4173`

## Próximo salto (fase siguiente)
- Backend real con autenticación multiusuario y PostgreSQL.
- Historial de rendimiento del portfolio (curva temporal).
- Alertas automáticas de precio/riesgo y rebalanceo.
- Integraciones broker/exchange con sincronización automática.
