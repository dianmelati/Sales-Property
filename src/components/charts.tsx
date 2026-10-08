/** Bagan ringan tanpa pustaka: SVG dirender di server, dengan ringkasan teks untuk pembaca layar. */
export function DailyBars({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 600, H = 120, gap = 3, bw = (W - gap * (data.length - 1)) / data.length;
  const total = data.reduce((a, d) => a + d.count, 0);
  const fmt = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={`${label}: ${total} in the last ${data.length} days, peak ${max} in one day`}>
        <line x1="0" x2={W} y1={H} y2={H} className="stroke-basalt/30" />
        {data.map((d, i) => {
          const h = d.count === 0 ? 1 : Math.max(3, (d.count / max) * (H - 8));
          return <rect key={d.date} x={i * (bw + gap)} y={H - h} width={bw} height={h} className={d.count ? "fill-basalt" : "fill-basalt/20"}><title>{`${fmt(d.date)}: ${d.count}`}</title></rect>;
        })}
        <text x="0" y={H + 14} className="fill-mist text-[11px]">{fmt(data[0].date)}</text>
        <text x={W} y={H + 14} textAnchor="end" className="fill-mist text-[11px]">{fmt(data[data.length - 1].date)}</text>
      </svg>
    </figure>
  );
}

export function StatusBars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 text-sm">
          <span>{r.label}</span>
          <span className="h-2 bg-stone"><span className="block h-2 bg-moss" style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums text-mist">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
