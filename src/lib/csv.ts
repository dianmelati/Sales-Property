/** Sel yang diawali = + - @ bisa dieksekusi sebagai rumus di Excel/Sheets. Awali dengan tanda kutip tunggal. */
export const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
