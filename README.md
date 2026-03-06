# Finacon

App web inicial para finanzas personales + inversiones.

## Qué incluye ya
- Registro local de movimientos de ingresos y gastos.
- Resumen mensual (ingresos, gastos, balance).
- Zona de inversiones para **crypto, acciones y ETF**.
- Cálculo automático de valor actual y P/L por posición.
- Actualización de precios de mercado con APIs públicas:
  - Crypto: CoinGecko.
  - Acciones/ETF: Financial Modeling Prep (demo).

## Ejecutar en local
Como es una base frontend simple, puedes abrir `index.html` directamente o levantar un servidor estático.

### Opción recomendada
```bash
python3 -m http.server 4173
```
Luego abre: `http://localhost:4173`

## Estructura
- `index.html`: layout principal y formularios.
- `style.css`: estilos responsive.
- `app.js`: lógica de transacciones, portfolio y precios en vivo.

## Siguiente paso sugerido
Migrar esta base a Next.js + backend propio para:
- login real multiusuario,
- persistencia en PostgreSQL,
- agregadores de mercado con claves propias,
- alertas y automatizaciones avanzadas.
