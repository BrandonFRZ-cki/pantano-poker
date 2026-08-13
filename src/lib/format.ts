// Ecuador usa el dólar como moneda oficial, así que currency: "USD" con
// locale es-EC queda natural (separador de miles con punto, decimales con coma).

export function formatChips(amount: number): string {
  return new Intl.NumberFormat("es-EC").format(amount);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
