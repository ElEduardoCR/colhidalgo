"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate, todayISO } from "@/lib/format";

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
  `Hola ${nombre}, le saluda la Junta Rural de Agua y Saneamiento. Le recordamos su pago programado por ${currency(monto)} para el ${fmtDate(fecha)} (convenio ${folio}). Gracias.`;

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
        const cuenta = cuentahabientes.find(
          (x) => x.id === c.cuentahabienteId,
        );
        return c.pagos.map((p) => {
          const estado: Item["estado"] =
            p.estado === "pagado"
              ? "pagado"
              : p.fechaProgramada < hoy
                ? "vencido"
                : "pendiente";
          return {
            convenioId: c.id,
            pagoId: p.id,
            folio: c.folio,
            cuentahabienteId: c.cuentahabienteId,
            nombre: cuenta?.nombre ?? "-",
            telefono: cuenta?.telefono ?? "",
            fecha: p.fechaProgramada,
            monto: p.monto,
            estado,
            numero: p.numero,
            total: c.numeroPagos,
          };
        });
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [convenios, cuentahabientes]);

  const hoy = todayISO();
  const en7 = new Date();
  en7.setDate(en7.getDate() + 7);
  const en7ISO = en7.toISOString().slice(0, 10);

  const filtrados = useMemo(() => {
    if (vista === "hoy") return items.filter((i) => i.fecha === hoy);
    if (vista === "vencidos")
      return items.filter((i) => i.estado === "vencido");
    if (vista === "semana")
      return items.filter(
        (i) => i.fecha >= hoy && i.fecha <= en7ISO && i.estado !== "pagado",
      );
    return items;
  }, [items, vista, hoy, en7ISO]);

  // agrupar por fecha
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
        subtitle="Visibilidad de quien debe venir a pagar. Contactar via WhatsApp o llamada si el pago no se realiza."
        actions={
          <div className="flex gap-1 bg-paper-mute rounded-full p-1">
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
                  "px-3 py-1.5 rounded-full text-xs font-medium transition " +
                  (vista === k
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft hover:text-ink")
                }
              >
                {l}
              </button>
            ))}
          </div>
        }
      />

      {grupos.length === 0 ? (
        <div className="card p-12 text-center text-ink-mute">
          No hay pagos en esta vista.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([fecha, lista]) => (
            <section key={fecha} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">
                  {fmtDate(fecha)}
                  {fecha === hoy && (
                    <span className="ml-2 chip-warn">hoy</span>
                  )}
                  {fecha < hoy && (
                    <span className="ml-2 chip-warn">vencido</span>
                  )}
                </h2>
                <div className="text-xs text-ink-mute">
                  {lista.length} pago(s) -{" "}
                  {currency(lista.reduce((s, x) => s + x.monto, 0))}
                </div>
              </div>
              <ul className="divide-y divide-paper-line">
                {lista.map((it) => {
                  const wa = `https://wa.me/${limpiarTel(it.telefono)}?text=${encodeURIComponent(
                    mensajeRecordatorio(it.nombre, it.monto, it.fecha, it.folio),
                  )}`;
                  return (
                    <li
                      key={it.pagoId}
                      className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <div className="font-medium">{it.nombre}</div>
                        <div className="text-xs text-ink-mute">
                          {it.folio} - pago {it.numero}/{it.total}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold mr-2">
                          {currency(it.monto)}
                        </span>
                        {it.estado === "pagado" && (
                          <span className="chip-warn">pagado</span>
                        )}
                        {it.estado === "pendiente" && (
                          <span className="chip-line">pendiente</span>
                        )}
                        {it.estado === "vencido" && (
                          <span className="chip-warn">vencido</span>
                        )}
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-xs"
                        >
                          WhatsApp
                        </a>
                        <a
                          href={`tel:+${limpiarTel(it.telefono)}`}
                          className="btn-secondary text-xs"
                        >
                          Llamar
                        </a>
                        <Link
                          href={`/convenios/${it.convenioId}`}
                          className="btn-ghost text-xs"
                        >
                          Ver convenio
                        </Link>
                        {it.estado !== "pagado" && (
                          <button
                            className="btn-primary text-xs"
                            onClick={() =>
                              marcarPago(
                                it.convenioId,
                                it.pagoId,
                                "pagado",
                                todayISO(),
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
          ))}
        </div>
      )}
    </>
  );
}
