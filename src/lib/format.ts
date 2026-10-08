export function formatPrice(value: number, currency = "IDR"): string {
  if (currency === "IDR") {
    if (value >= 1e9) return `Rp ${(value / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} miliar`;
    if (value >= 1e6) return `Rp ${(value / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} juta`;
  }
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatPriceFull(value: number, currency = "IDR"): string {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value).replace(/\u00a0/g, " ");
}
