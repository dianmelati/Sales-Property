/** Nomor diambil dari SiteSetting "whatsapp.number" (Admin > Settings). Jangan di-hard-code. */
/** "0813..." menjadi "62813..." (kode negara bawaan Indonesia). Angka berawalan 00 atau kode negara dibiarkan. */
export function normalizeWhatsApp(raw: string, countryCode = "62"): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = countryCode + d.slice(1);
  return d.length >= 9 && d.length <= 15 ? d : null;
}

export function buildWhatsAppUrl(rawNumber: string, propertyTitle?: string): string {
  const digits = normalizeWhatsApp(rawNumber) ?? rawNumber.replace(/\D/g, "");
  const text = propertyTitle
    ? `Hello, I am interested in ${propertyTitle}. I would like to know more about the property and arrange a viewing.`
    : "Hello, I would like to know more about your properties.";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
