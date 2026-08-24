"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate, todayISO } from "@/lib/format";
import { IconTelefono, IconWhatsApp } from "@/components/icons";

type Item = {
  convenioId: string;
  pagoId: string;
  folio: string;
  cuentahabienteId: string;
  nombre: string;
  telefono: string;
  fecha: string;
  monto: number;
  estado: "pagado" | "pendiente" | "vencido";
  numero: number;
  total: number;
};

const limpiarTel = (t: string) => t.replace(/\D/g, "");

const mensajeRecordatorio = (
  nombre: string,
  monto: number,
  fecha: string,
  folio: string,
) =>
  `Hola ${nombre}, le saluda la Junta Rural de Agua Potable de Col. Hidalgo. Le recordamos su pago programado por ${currency(monto)} para el ${fmtDate(fecha)} (convenio ${folio}). Gracias.`;

export default function CalendarioPage() {
  const { convenios, cuentahabientes, marcarPago } = useStore();
  const [vista, setVista] = useState<"todos" | "hoy" | "vencidos" | "semana">(
    "semana",
  );

  const items: Item[] = useMemo(() => {
    const hoy = todayISO();
    return convenios
      .filter((c) => c.estado === "activo")
      .flatMap((c) => {
        const cuenta = cuentahabientes.find((x) => x.id === c.cuentahabienteId);
        return c.pagos.map((p) => ({
          convenioId: c.id,
          pagoId: p.id,
          folio: c.folio,
          cuentahabienteId: c.cuentahabienteId,
          nombre: cuenta?.nombre ?? "—",
          telefono: cuenta?.telefono ?? "",
          fecha: p.fechaProgramada,
          monto: p.monto,
          estado:
            p.estado === "pagado"
              ? ("pagado" as const)
              : p.fechaProgramada < hoy
                ? ("vencido" as const)
                : ("pendiente" as const),
          numero: p.numero,
          total: c.numeroPagos,
        }));
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [convenios, cuentahabientes]);

  const hoy = todayISO();
  const en7 = new Date();
  en7.setDate(en7.getDate() + 7);
  const en7ISO = en7.toISOString().slice(0, 10);

  const conteos = useMemo(
    () => ({
      semana: items.filter(
        (i) => i.fecha >= hoy && i.fecha <= en7ISO && i.estado !== "pagado",
      ).length,
      hoy: items.filter((i) => i.fecha === hoy).length,
      vencidos: items.filter((i) => i.estado === "vencido").length,
      todos: items.length,
    }),
    [items, hoy, en7ISO],
  );

  const filtrados = useMemo(() => {
    if (vista === "hoy") return items.filter((i) => i.fecha === hoy);
    if (vista === "vencidos") return items.filter((i) => i.estado === "vencido");
    if (vista === "semana")
      return items.filter(
        (i) => i.fecha >= hoy && i.fecha <= en7ISO && i.estado !== "pagado",
      );
    return items;
  }, [items, vista, hoy, en7ISO]);

  const grupos = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filtrados) {
      const arr = map.get(it.fecha) ?? [];
      arr.push(it);
      map.set(it.fecha, arr);
    }
    return Array.from(map.entries());
  }, [filtrados]);

  return (
    <>
      <PageHeader
        eyebrow="Pagos"
        title="Calendario de pagos"
        subtitle="Quien debe venir a pagar y cuando. Contacta por WhatsApp o llamada si el pago no se realiza."
        actions={
          <div className="flex gap-1 rounded-full border border-pizarra-line bg-white p-1">
            {(
              [
                ["semana", "Esta semana"],
                ["hoy", "Hoy"],
                ["vencidos", "Vencidos"],
                ["todos", "Todos"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setVista(k)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                  (vista === k
                    ? "bg-marino-800 text-white shadow-sm"
                    : "text-pizarra-soft hover:bg-pizarra-fill hover:text-marino-800")
                }
              >
                {l}
                <span
                  className={
                    "ml-1.5 tabular-nums " +
                    (vista === k ? "text-aqua-300" : "text-pizarra-mute")
                  }
                >
                  {conteos[k]}
                </span>
              </button>
            ))}
          </div>
        }
      />

      {grupos.length === 0 ? (
        <div className="card p-14 text-center text-sm text-pizarra-mute">
          No hay pagos en esta vista.
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(([fecha, lista]) => {
            const esHoy = fecha === hoy;
            const vencido = fecha < hoy;
            return (
              <section key={fecha} className="card overflow-hidden">
                <div
                  className={
                    "flex items-center justify-between px-5 py-3 " +
                    (esHoy
                      ? "bg-aqua-50 border-b border-aqua-200"
                      : vencido
                        ? "bg-alerta-soft border-b border-alerta/20"
                        : "bg-pizarra-fill border-b border-pizarra-line")
                  }
                >
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-marino-900">
                    {fmtDate(fecha)}
                    {esHoy && <span className="chip-aqua">hoy</span>}
                    {vencido && <span className="chip-alerta">vencido</span>}
                  </h2>
                  <div className="text-xs text-pizarra-soft">
                    {lista.length} pago(s) ·{" "}
                    <span className="font-semibold text-marino-900">
                      {currency(lista.reduce((s, x) => s + x.monto, 0))}
                    </span>
                  </div>
                </div>

                <ul className="divide-y divide-pizarra-line px-5">
                  {lista.map((it) => {
                    const tel = limpiarTel(it.telefono);
                    const wa = `https://wa.me/${tel}?text=${encodeURIComponent(
                      mensajeRecordatorio(it.nombre, it.monto, it.fecha, it.folio),
                    )}`;
                    return (
                      <li
                        key={it.pagoId}
                        className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-marino-900">
                            {it.nombre}
                          </div>
                          <div className="text-xs text-pizarra-mute">
                            {it.folio} · pago {it.numero}/{it.total}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-1 text-sm font-semibold text-marino-900">
                            {currency(it.monto)}
                          </span>
                          {it.estado === "pagado" && (
                            <span className="chip-exito">pagado</span>
                          )}
                          {it.estado === "pendiente" && (
                            <span className="chip-line">pendiente</span>
                          )}
                          {it.estado === "vencido" && (
                            <span className="chip-alerta">vencido</span>
                          )}
                          {tel ? (
                            <>
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary text-xs"
                              >
                                <IconWhatsApp /> WhatsApp
                              </a>
                              <a
                                href={`tel:+${tel}`}
                                className="btn-secondary text-xs"
                              >
                                <IconTelefono /> Llamar
                              </a>
                            </>
                          ) : (
                            <span
                              className="chip-line"
                              title="Captura el telefono en Morosidad"
                            >
                              sin telefono
                            </span>
                          )}
                          <Link
                            href={`/convenios/${it.convenioId}`}
                            className="btn-ghost text-xs"
                          >
                            Ver convenio
                          </Link>
                          {it.estado !== "pagado" && (
                            <button
                              className="btn-aqua text-xs"
                              onClick={() =>
                                marcarPago(
                                  it.convenioId,
                                  it.pagoId,
                                  "pagado",
                                  todayISO(),
                                ).catch((err) =>
                                  alert("Error: " + (err?.message ?? err)),
                                )
                              }
                            >
                              Marcar pagado
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
