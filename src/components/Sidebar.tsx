"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Resumen" },
  { href: "/morosidad", label: "Morosidad" },
  { href: "/convenios", label: "Convenios" },
  { href: "/convenios/nuevo", label: "Nuevo convenio" },
  { href: "/calendario", label: "Calendario de pagos" },
  { href: "/archivo", label: "Archivo y auditoria" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-paper-line bg-white/70 backdrop-blur sticky top-0 h-screen no-print">
      <div className="px-6 py-8">
        <div className="text-[11px] uppercase tracking-widest text-ink-mute">
          Junta Rural
        </div>
        <div className="mt-1 text-lg font-semibold leading-tight">
          Agua y Saneamiento
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-ink-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          Sistema de morosidad
        </div>
      </div>
      <nav className="px-3 flex-1">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "block rounded-xl px-3 py-2 text-sm transition " +
                    (active
                      ? "bg-ink text-white"
                      : "text-ink-soft hover:bg-paper-mute hover:text-ink")
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-6 py-6 text-[11px] text-ink-mute border-t border-paper-line">
        v0.1 - Prototipo local
      </div>
    </aside>
  );
}
