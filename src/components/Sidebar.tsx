"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconArchivo,
  IconCalendario,
  IconCerrar,
  IconConvenio,
  IconCortes,
  IconGota,
  IconImportar,
  IconMenu,
  IconMorosidad,
  IconNuevo,
  IconRecordatorio,
  IconResumen,
} from "./icons";

const nav = [
  { href: "/", label: "Resumen", Icon: IconResumen },
  { href: "/morosidad", label: "Morosidad", Icon: IconMorosidad },
  { href: "/importar", label: "Importar corte", Icon: IconImportar },
  { href: "/cortes", label: "Detalle de cortes", Icon: IconCortes },
  { href: "/convenios", label: "Convenios", Icon: IconConvenio },
  { href: "/convenios/nuevo", label: "Nuevo convenio", Icon: IconNuevo },
  { href: "/calendario", label: "Calendario de pagos", Icon: IconCalendario },
  { href: "/recordatorios", label: "Recordatorios", Icon: IconRecordatorio },
  { href: "/archivo", label: "Archivo y auditoria", Icon: IconArchivo },
];

const esActivo = (href: string, pathname: string) => {
  if (href === "/") return pathname === "/";
  if (href === "/convenios")
    return pathname === "/convenios" || /^\/convenios\/(?!nuevo)/.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
};

function Marca({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-aqua-500/15 ring-1 ring-aqua-400/40">
        <IconGota className="h-5 w-5 text-aqua-300" />
      </span>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-aqua-300">
          Junta Rural
        </div>
        <div
          className={
            // "Agua y Saneamiento" cabe justo en la barra de 240px: se usa un
            // cuerpo menor ahi y el completo cuando la barra crece en xl.
            "font-semibold leading-snug text-white " +
            (compacto ? "text-sm" : "text-sm xl:text-[15px]")
          }
        >
          Agua y Saneamiento
        </div>
        <div className="text-[11px] text-marino-200/80">Col. Hidalgo</div>
      </div>
    </div>
  );
}

function Enlaces({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {nav.map(({ href, label, Icon }) => {
        const activo = esActivo(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={activo ? "page" : undefined}
              className={
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition " +
                (activo
                  ? "bg-white/10 font-semibold text-white"
                  : "text-marino-100/75 hover:bg-white/[0.06] hover:text-white")
              }
            >
              {activo && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-aqua-400" />
              )}
              <Icon
                className={
                  "h-[18px] w-[18px] shrink-0 transition " +
                  (activo
                    ? "text-aqua-300"
                    : "text-marino-200/60 group-hover:text-aqua-300")
                }
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Cerrar el menu movil al cambiar de pagina
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <>
      {/* ===== Escritorio ===== */}
      <aside className="no-print safe-top sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-marino-grad lg:flex xl:w-72">
        <div className="px-5 py-7">
          <Marca />
        </div>
        <nav className="flex-1 px-3">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-marino-200/50">
            Menu
          </div>
          <Enlaces />
        </nav>
        <div className="border-t border-white/10 px-5 py-5">
          <div className="flex items-center gap-2 text-[11px] text-marino-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua-400" />
            Sistema de morosidad y convenios
          </div>
        </div>
      </aside>

      {/* ===== Movil: barra superior ===== */}
      <header className="no-print safe-top safe-x sticky top-0 z-40 flex items-center justify-between bg-marino-grad px-4 py-3 lg:hidden">
        <Marca compacto />
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menu"
          className="grid h-10 w-10 place-items-center rounded-xl text-white transition hover:bg-white/10"
        >
          <IconMenu />
        </button>
      </header>

      {/* ===== Movil: cajon ===== */}
      {abierto && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-marino-950/60 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <div className="safe-top absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-marino-grad shadow-marino">
            <div className="flex items-start justify-between px-5 py-6">
              <Marca />
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menu"
                className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <IconCerrar />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3">
              <Enlaces onNavigate={() => setAbierto(false)} />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
