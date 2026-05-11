const THUMB_PX = 18;

export default function RangeSlider({
  min, max, value, onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const span = Math.max(max - min, 1);
  const loFrac = Math.max(0, Math.min(1, (lo - min) / span));
  const hiFrac = Math.max(0, Math.min(1, (hi - min) / span));

  const half = THUMB_PX / 2;
  const innerL = `calc(${loFrac} * (100% - ${THUMB_PX}px) + ${half}px)`;
  const innerR = `calc(${1 - hiFrac} * (100% - ${THUMB_PX}px) + ${half}px)`;

  return (
    <div className="w-full">
      <div className="relative h-5">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--c-border)]"
          style={{ left: `${half}px`, right: `${half}px` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-[var(--c-accent)]"
          style={{ left: innerL, right: innerR }}
        />
        <input
          type="range"
          min={min} max={max}
          value={lo}
          onChange={(e) => onChange([Math.min(+e.target.value, hi), hi])}
          className="range-thumb absolute inset-0 w-full h-full"
          aria-label="Minimum amount"
        />
        <input
          type="range"
          min={min} max={max}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(+e.target.value, lo)])}
          className="range-thumb absolute inset-0 w-full h-full"
          aria-label="Maximum amount"
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--c-text-2)] mt-2">
        <span>${lo}</span>
        <span>${hi}</span>
      </div>
    </div>
  );
}
