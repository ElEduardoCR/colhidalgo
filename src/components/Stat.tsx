export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-widest text-ink-mute">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-mute">{hint}</div>}
    </div>
  );
}
