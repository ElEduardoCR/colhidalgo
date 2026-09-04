type P = { className?: string };
const base = "h-[18px] w-[18px] shrink-0";

/** Iconos de linea, trazo uniforme, pensados para heredar el color del texto. */
const Svg = ({
  className,
  children,
}: P & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? base}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconResumen = (p: P) => (
  <Svg {...p}>
    <path d="M3 12.5 12 4l9 8.5" />
    <path d="M5.5 10.8V20h13v-9.2" />
    <path d="M9.8 20v-5.2h4.4V20" />
  </Svg>
);

export const IconMorosidad = (p: P) => (
  <Svg {...p}>
    <path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.4V20" />
    <circle cx="9.5" cy="7.6" r="3.6" />
    <path d="M18.5 8.5v3.2" />
    <path d="M18.5 14.4h.01" />
  </Svg>
);

export const IconConvenio = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z" />
    <path d="M14.5 3v4.5H19" />
    <path d="M8.8 13h6.4" />
    <path d="M8.8 16.6h4.2" />
  </Svg>
);

export const IconNuevo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 8.6v6.8" />
    <path d="M8.6 12h6.8" />
  </Svg>
);

export const IconCalendario = (p: P) => (
  <Svg {...p}>
    <rect x="3.4" y="5" width="17.2" height="15.6" rx="2.4" />
    <path d="M3.4 9.8h17.2" />
    <path d="M8.2 3.4v3.2" />
    <path d="M15.8 3.4v3.2" />
    <path d="M8 13.6h2" />
    <path d="M14 13.6h2" />
    <path d="M8 17h2" />
  </Svg>
);

export const IconRecordatorio = (p: P) => (
  <Svg {...p}>
    <path d="M18 8.6a6 6 0 1 0-12 0c0 5-2.2 6.4-2.2 6.4h16.4S18 13.6 18 8.6" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconArchivo = (p: P) => (
  <Svg {...p}>
    <rect x="3.2" y="4.2" width="17.6" height="4.4" rx="1.4" />
    <path d="M5 8.6V19a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 19V8.6" />
    <path d="M10 12.4h4" />
  </Svg>
);

export const IconImportar = (p: P) => (
  <Svg {...p}>
    <path d="M20.6 15.4v3.2a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8v-3.2" />
    <path d="m7.8 9.4 4.2-4.2 4.2 4.2" />
    <path d="M12 5.2v10.2" />
  </Svg>
);

export const IconGota = ({ className }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className ?? base}
    aria-hidden="true"
  >
    <path d="M12 2.5s6.5 7.1 6.5 11.4a6.5 6.5 0 1 1-13 0C5.5 9.6 12 2.5 12 2.5Z" />
  </svg>
);

export const IconWhatsApp = ({ className }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className ?? "h-4 w-4 shrink-0"}
    aria-hidden="true"
  >
    <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.1Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2a.5.5 0 0 0 0-.5c0-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.6 4 5.2 5.2 0 0 0 3.2.7 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z" />
  </svg>
);

export const IconTelefono = (p: P) => (
  <Svg {...p} className={p.className ?? "h-4 w-4 shrink-0"}>
    <path d="M20.5 16.9v2.4a1.6 1.6 0 0 1-1.8 1.6 16 16 0 0 1-7-2.5 15.7 15.7 0 0 1-4.8-4.8 16 16 0 0 1-2.5-7.1A1.6 1.6 0 0 1 6 4.7h2.4a1.6 1.6 0 0 1 1.6 1.4 10 10 0 0 0 .6 2.4 1.6 1.6 0 0 1-.4 1.7l-1 1a12.8 12.8 0 0 0 4.8 4.8l1-1a1.6 1.6 0 0 1 1.7-.4 10 10 0 0 0 2.4.6 1.6 1.6 0 0 1 1.4 1.7Z" />
  </Svg>
);

export const IconBuscar = (p: P) => (
  <Svg {...p} className={p.className ?? "h-4 w-4 shrink-0"}>
    <circle cx="11" cy="11" r="6.6" />
    <path d="m16 16 4.2 4.2" />
  </Svg>
);

export const IconMenu = (p: P) => (
  <Svg {...p} className={p.className ?? "h-5 w-5 shrink-0"}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
);

export const IconCerrar = (p: P) => (
  <Svg {...p} className={p.className ?? "h-5 w-5 shrink-0"}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Svg>
);

export const IconImprimir = (p: P) => (
  <Svg {...p} className={p.className ?? "h-4 w-4 shrink-0"}>
    <path d="M6.4 9.4V3.8h11.2v5.6" />
    <rect x="3.4" y="9.4" width="17.2" height="7" rx="1.8" />
    <path d="M6.4 14.2h11.2v6H6.4z" />
  </Svg>
);
