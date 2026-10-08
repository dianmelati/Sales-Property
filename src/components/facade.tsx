/**
 * Placeholder gambar arsitektural (SVG). Dipakai sampai foto asli diunggah lewat
 * Media Library. Diganti oleh <PropertyImage> yang membaca varian WebP dari database.
 */
export function Facade({ tone = 0, className = "" }: { tone?: number; className?: string }) {
  const palettes = [
    ["#C9CFC8", "#9FAAA3", "#2B3A3E"],
    ["#D8D3C8", "#B3AA98", "#3A3A33"],
    ["#BFCBCB", "#8FA5A5", "#1F3338"],
  ];
  const [sky, wall, ink] = palettes[tone % palettes.length];
  return (
    <svg viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Architectural placeholder">
      <rect width="800" height="560" fill={sky} />
      <rect x="0" y="430" width="800" height="130" fill={ink} opacity=".18" />
      <rect x="90" y="190" width="420" height="240" fill={wall} />
      <rect x="470" y="120" width="230" height="310" fill={ink} opacity=".9" />
      <rect x="60" y="170" width="480" height="22" fill={ink} />
      <g fill={sky} opacity=".85">
        <rect x="130" y="235" width="110" height="130" />
        <rect x="270" y="235" width="190" height="130" />
        <rect x="510" y="165" width="150" height="75" />
        <rect x="510" y="275" width="150" height="120" />
      </g>
      <g stroke={ink} strokeWidth="3" opacity=".5">
        <path d="M185 235v130M365 235v130M510 202h150M585 275v120" />
      </g>
    </svg>
  );
}
