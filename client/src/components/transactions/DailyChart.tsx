export default function DailyChart({ values, max }: { values: number[]; max: number }) {
  const N = values.length;
  const SVG_W = 600, SVG_H = 180;
  const PAD_L = 30, PAD_R = 4, PAD_T = 10, PAD_B = 22;
  const PLOT_W = SVG_W - PAD_L - PAD_R;
  const PLOT_H = SVG_H - PAD_T - PAD_B;
  const barGap = 2;
  const barW = Math.max((PLOT_W - barGap * (N - 1)) / N, 4);

  const rawY = Math.max(max, 10);
  const stepMag = Math.pow(10, Math.floor(Math.log10(rawY)));
  const yStep = ([1, 2, 5, 10].map((s) => s * stepMag).find((s) => rawY / s <= 5)) ?? stepMag * 10;
  const yMax = yStep * Math.ceil(rawY / yStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
      {yTicks.map((tick) => {
        const y = PAD_T + PLOT_H - (tick / yMax) * PLOT_H;
        return (
          <g key={tick}>
            <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y} stroke="var(--c-grid)" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--c-text-2)">
              ${tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
            </text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const h = (v / yMax) * PLOT_H;
        const x = PAD_L + i * (barW + barGap);
        const y = PAD_T + PLOT_H - h;
        return (
          <rect
            key={i}
            x={x} y={y}
            width={barW} height={Math.max(h, v > 0 ? 1 : 0)}
            rx="2"
            fill="var(--c-accent)"
            opacity={v > 0 ? 0.85 : 0}
          />
        );
      })}
      {Array.from({ length: N }, (_, i) => i + 1).map((d) => {
        const x = PAD_L + (d - 1) * (barW + barGap) + barW / 2;
        return (
          <text key={d} x={x} y={SVG_H - 6} textAnchor="middle" fontSize="9" fill="var(--c-text-2)">{d}</text>
        );
      })}
    </svg>
  );
}
