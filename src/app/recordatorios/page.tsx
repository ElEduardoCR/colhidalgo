"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate, todayISO } from "@/lib/format";
import { IconTelefono, IconWhatsApp } from "@/components/icons";

const limpiarTel = (t: string) => t.replace(/\D/g, "");

const manana = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

type Recordatorio = {
  key: string;
  tipo: "dia-antes" | "dia-de-pago";
  convenioId: string;
  pagoId: string;
  folio: string;
  nombre: string;
  telefono: string;
  fecha: string;
  monto: number;
  numero: number;
  total: number;
};

export default function RecordatoriosPage() {
  const { convenios, cuentahabientes, marcarPago } = useStore();

  const recordatorios: Recordatorio[] = useMemo(() => {
    const hoy = todayISO();
    const man = manana();
    const items: Recordatorio[] = [];
    for (const c of convenios) {
      if (c.estado !== "activo") continue;
      const cuenta = cuentahabientes.find((x) => x.id === c.cuentahabienteId);
      for (const p of c.pagos) {
        if (p.estado === "pagado") continue;
        const base = {
          convenioId: c.id,
          pagoId: p.id,
          folio: c.folio,
          nombre: cuenta?.nombre ?? "-",
          telefono: cuenta?.telefono ?? "",
          fecha: p.fechaProgramada,
          monto: p.monto,
          numero: p.numero,
          total: c.numeroPagos,
        };
        if ((c.recordarDiaAntes ?? true) && p.fechaProgramada === man) {
          items.push({ ...base, key: p.id + "-a", tipo: "dia-antes" });
        }
        if ((c.recordarDiaDePago ?? true) && p.fechaProgramada === hoy) {
          items.push({ ...base, key: p.id + "-h", tipo: "dia-de-pago" });
        }
      }
    }
    return items;
  }, [convenios, cuentahabientes]);

  const mensaje = (r: Recordatorio) => {
    if (r.tipo === "dia-antes") {
      return `Hola ${r.nombre}, le saluda la Junta Rural de Agua Potable de Col. Hidalgo. Le recordamos que manana ${fmtDate(r.fecha)} vence su pago de ${currency(r.monto)} (convenio ${r.folio}, pago ${r.numero}/${r.total}). Gracias.`;
    }
    return `Hola ${r.nombre}, le saluda la Junta Rural de Agua Potable de Col. Hidalgo. Le recordamos que hoy ${fmtDate(r.fecha)} es el dia de su pago de ${currency(r.monto)} (convenio ${r.folio}, pago ${r.numero}/${r.total}). Gracias.`;
  };

  const grupos = [
    {
      tipo: "dia-de-pago" as const,
      titulo: "Pagos de hoy",
      subtitulo: "Avisar el dia del pago",
    },
    {
      tipo: "dia-antes" as const,
      titulo: "Pagos de manana",
      subtitulo: "Avisar un dia antes",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Recordatorios"
        title="Avisos por WhatsApp"
        subtitle="Segun lo acordado en cada convenio: un dia antes y el dia del pago. Toca para enviar el mensaje ya redactado."
      />

      {recordatorios.length === 0 ? (
        <div className="card p-14 text-center text-sm text-pizarra-mute">
          No hay recordatorios para hoy ni para manana.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => {
            const lista = recordatorios.filter((r) => r.tipo === g.tipo);
            if (lista.length === 0) return null;
            return (
              <section key={g.tipo} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-marino-900">{g.titulo}</h2>
                    <div className="text-xs text-pizarra-mute">{g.subtitulo}</div>
                  </div>
                  <span className="chip-aqua">{lista.length}</span>
                </div>
                <ul className="divide-y divide-pizarra-line">
                  {lista.map((r) => {
                    const tel = limpiarTel(r.telefono);
                    const wa = `https://wa.me/${tel}?text=${encodeURIComponent(
                      mensaje(r),
                    )}`;
                    return (
                      <li
                        key={r.key}
                        className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                      >
                        <div>
                          <div className="font-medium text-marino-900">{r.nombre}</div>
                          <div className="text-xs text-pizarra-mute">
                            {r.folio} · pago {r.numero}/{r.total} ·{" "}
                            {currency(r.monto)} · {fmtDate(r.fecha)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {tel ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary text-xs"
                            >
                              <IconWhatsApp /> WhatsApp
                            </a>
                          ) : (
                            <span className="chip-line" title="Sin telefono">
                              sin telefono
                            </span>
                          )}
                          {tel && (
                            <a
                              href={`tel:+${tel}`}
                              className="btn-secondary text-xs"
                            >
                              <IconTelefono /> Llamar
                            </a>
                          )}
                          <Link
                            href={`/convenios/${r.convenioId}`}
                            className="btn-ghost text-xs"
                          >
                            Ver convenio
                          </Link>
                          <button
                            className="btn-aqua text-xs"
                            onClick={() =>
                              marcarPago(
                                r.convenioId,
                                r.pagoId,
                                "pagado",
                                todayISO(),
                              ).catch((err) =>
                                alert("Error: " + (err?.message ?? err)),
                              )
                            }
                          >
                            Marcar pagado
                          </button>
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
