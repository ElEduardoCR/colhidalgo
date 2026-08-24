"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate } from "@/lib/format";

export default function ArchivoPage() {
  const { convenios, cuentahabientes } = useStore();
  const [q, setQ] = useState("");

  const archivados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return convenios
      .filter((c) => c.estado !== "activo")
      .filter((c) => {
        if (!term) return true;
        const cuenta = cuentahabientes.find(
          (x) => x.id === c.cuentahabienteId,
        );
        return (
          c.folio.toLowerCase().includes(term) ||
          cuenta?.nombre.toLowerCase().includes(term) ||
          cuenta?.numeroCuenta.toLowerCase().includes(term)
        );
      });
  }, [convenios, cuentahabientes, q]);

  const nombre = (id: string) =>
    cuentahabientes.find((x) => x.id === id)?.nombre ?? "-";

  return (
    <>
      <PageHeader
        eyebrow="Auditoria"
        title="Convenios archivados"
        subtitle="Historico de convenios completados o cancelados para fines de auditoria."
      />

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <input
            className="input md:max-w-sm"
            placeholder="Buscar por folio, cuenta o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="text-xs text-pizarra-mute">
            {archivados.length} convenio(s)
          </div>
        </div>

        {archivados.length === 0 ? (
          <div className="py-14 text-center text-sm text-pizarra-mute">
            No hay convenios archivados todavia.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pizarra-line">
                  <th className="th">Folio</th>
                  <th className="th">Cuentahabiente</th>
                  <th className="th">Deuda original</th>
                  <th className="th">Pagos</th>
                  <th className="th">Estado</th>
                  <th className="th">Archivado</th>
                  <th className="th text-right">Expediente</th>
                </tr>
              </thead>
              <tbody>
                {archivados.map((c) => (
                  <tr key={c.id} className="tr-row">
                    <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-pizarra-soft">{c.folio}</td>
                    <td className="py-3 pr-4 font-medium text-marino-900">
                      {nombre(c.cuentahabienteId)}
                    </td>
                    <td className="py-3 pr-4">{currency(c.deudaTotal)}</td>
                    <td className="py-3 pr-4">
                      {c.pagos.filter((p) => p.estado === "pagado").length} /{" "}
                      {c.numeroPagos}
                    </td>
                    <td className="py-3 pr-4">
                      {c.estado === "completado" ? (
                        <span className="chip-exito">completado</span>
                      ) : (
                        <span className="chip-alerta">cancelado</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-pizarra-soft">
                      {c.archivadoEn ? fmtDate(c.archivadoEn) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/convenios/${c.id}`}
                        className="link text-xs"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
