"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate, todayISO } from "@/lib/format";
import { IconBuscar } from "@/components/icons";

export default function ConveniosPage() {
  const { convenios, cuentahabientes } = useStore();
  const [q, setQ] = useState("");

  const hoy = todayISO();
  const cuenta = (id: string) => cuentahabientes.find((x) => x.id === id);

  const activos = useMemo(() => {
    const term = q.trim().toLowerCase();
    return convenios
      .filter((c) => c.estado === "activo")
      .filter((c) => {
        if (!term) return true;
        const p = cuenta(c.cuentahabienteId);
        return (
          c.folio.toLowerCase().includes(term) ||
          (p?.nombre ?? "").toLowerCase().includes(term) ||
          (p?.numeroCuenta ?? "").includes(term)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convenios, cuentahabientes, q]);

  const porCobrar = activos.reduce(
    (s, c) =>
      s + c.pagos.filter((p) => p.estado !== "pagado").reduce((t, p) => t + p.monto, 0),
    0,
  );
  const conVencidos = activos.filter((c) =>
    c.pagos.some((p) => p.estado !== "pagado" && p.fechaProgramada < hoy),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Convenios"
        title="Convenios activos"
        subtitle="Acuerdos de pago vigentes y su avance."
        actions={
          <Link href="/convenios/nuevo" className="btn-primary">
            Nuevo convenio
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Activos" value={String(activos.length)} tono="marino" />
        <Stat
          label="Por cobrar"
          value={currency(porCobrar)}
          hint="Pagos pendientes"
          tono="aqua"
        />
        <Stat
          label="Con atraso"
          value={String(conVencidos)}
          hint={conVencidos ? "Requieren contacto" : "Todos al corriente"}
          tono={conVencidos ? "alerta" : "exito"}
        />
      </div>

      <div className="card p-5">
        {convenios.filter((c) => c.estado === "activo").length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-pizarra-mute">
              Aun no hay convenios activos.
            </p>
            <Link href="/convenios/nuevo" className="link mt-2 inline-block text-sm">
              Crear el primero
            </Link>
          </div>
        ) : (
          <>
            <div className="relative mb-5 max-w-sm">
              <IconBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra-mute" />
              <input
                className="input pl-9"
                placeholder="Buscar por folio, nombre o cuenta"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pizarra-line">
                    <th className="th">Folio</th>
                    <th className="th">Cuentahabiente</th>
                    <th className="th text-right">Deuda</th>
                    <th className="th">Pagos</th>
                    <th className="th">Avance</th>
                    <th className="th">Siguiente pago</th>
                    <th className="th text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((c) => {
                    const pagados = c.pagos.filter((p) => p.estado === "pagado").length;
                    const siguiente = c.pagos.find((p) => p.estado !== "pagado");
                    const atrasado =
                      !!siguiente && siguiente.fechaProgramada < hoy;
                    const pct = Math.round((pagados / c.numeroPagos) * 100);
                    const p = cuenta(c.cuentahabienteId);
                    return (
                      <tr key={c.id} className="tr-row">
                        <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-pizarra-soft">
                          {c.folio}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-marino-900">
                            {p?.nombre ?? "—"}
                          </div>
                          <div className="font-mono text-[11px] text-pizarra-mute">
                            {p?.numeroCuenta ?? ""}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-marino-900">
                          {currency(c.deudaTotal)}
                        </td>
                        <td className="py-3 pr-4 text-pizarra-soft">
                          {currency(c.montoPago)} × {c.numeroPagos}
                          <div className="text-[10px] capitalize text-pizarra-mute">
                            {c.periodicidad}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-pizarra-fill">
                              <div
                                className="h-full rounded-full bg-aqua-grad"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-pizarra-soft">
                              {pagados}/{c.numeroPagos}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {siguiente ? (
                            <span
                              className={
                                atrasado
                                  ? "font-medium text-alerta-ink"
                                  : "text-pizarra-soft"
                              }
                            >
                              {fmtDate(siguiente.fechaProgramada)}
                            </span>
                          ) : (
                            "—"
                          )}
                          {atrasado && (
                            <div>
                              <span className="chip-alerta mt-1">vencido</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <Link href={`/convenios/${c.id}`} className="link text-xs">
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {activos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-pizarra-mute">
                        Sin resultados para “{q}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
