export const currency = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(n);

export const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

export const fmtDateLong = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
};

export const addPeriod = (
  iso: string,
  periodicidad: "semanal" | "quincenal" | "mensual",
  n: number,
) => {
  const base = new Date(iso + "T12:00:00");
  if (periodicidad === "semanal") base.setDate(base.getDate() + 7 * n);
  else if (periodicidad === "quincenal") base.setDate(base.getDate() + 15 * n);
  else base.setMonth(base.getMonth() + n);
  return base.toISOString().slice(0, 10);
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
