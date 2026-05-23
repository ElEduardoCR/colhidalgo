export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-widest text-ink-mute">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-ink-soft max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2 no-print">{actions}</div>}
    </header>
  );
}
