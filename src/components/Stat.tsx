type Tono = "marino" | "aqua" | "exito" | "alerta" | "aviso";

const tonos: Record<Tono, { barra: string; valor: string }> = {
  marino: { barra: "bg-marino-800", valor: "text-marino-900" },
  aqua: { barra: "bg-aqua-500", valor: "text-marino-900" },
  exito: { barra: "bg-exito", valor: "text-exito-ink" },
  alerta: { barra: "bg-alerta", valor: "text-alerta-ink" },
  aviso: { barra: "bg-aviso", valor: "text-aviso-ink" },
};

export function Stat({
  label,
  value,
  hint,
  tono = "marino",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tono?: Tono;
  icon?: React.ReactNode;
}) {
  const t = tonos[tono];
  return (
    <div className="card-hover relative overflow-hidden p-5">
      <span className={"absolute inset-x-0 top-0 h-1 " + t.barra} />
      <div className="flex items-start justify-between gap-3">
        <div className="label">{label}</div>
        {icon && <span className="text-aqua-500">{icon}</span>}
      </div>
      <div
        className={
          "mt-2 break-words text-2xl font-semibold leading-tight tracking-tight tabular-nums sm:text-[26px] " +
          t.valor
        }
      >
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-pizarra-mute">{hint}</div>}
    </div>
  );
}
