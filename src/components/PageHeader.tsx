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
    <header className="mb-8 flex flex-col gap-4 border-b border-pizarra-line pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-700">
            <span className="h-1 w-6 rounded-full bg-aqua-grad" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-marino-900 md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pizarra-soft">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="no-print flex flex-wrap gap-2">{actions}</div>
      )}
    </header>
  );
}
