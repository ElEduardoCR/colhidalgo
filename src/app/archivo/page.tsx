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
          <div className="text-xs text-ink-mute">
            {archivados.length} convenio(s)
          </div>
        </div>

        {archivados.length === 0 ? (
          <div className="text-center py-12 text-ink-mute text-sm">
            No hay convenios archivados todavia.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-mute border-b border-paper-line">
                  <th className="py-2 pr-4 font-medium">Folio</th>
                  <th className="py-2 pr-4 font-medium">Cuentahabiente</th>
                  <th className="py-2 pr-4 font-medium">Deuda original</th>
                  <th className="py-2 pr-4 font-medium">Pagos</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Archivado</th>
                  <th className="py-2 font-medium text-right">Expediente</th>
                </tr>
              </thead>
              <tbody>
                {archivados.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-paper-line last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">{c.folio}</td>
                    <td className="py-3 pr-4 font-medium">
                      {nombre(c.cuentahabienteId)}
                    </td>
                    <td className="py-3 pr-4">{currency(c.deudaTotal)}</td>
                    <td className="py-3 pr-4">
                      {c.pagos.filter((p) => p.estado === "pagado").length} /{" "}
                      {c.numeroPagos}
                    </td>
                    <td className="py-3 pr-4">
                      {c.estado === "completado" ? (
                        <span className="chip-warn">completado</span>
                      ) : (
                        <span className="chip-line">cancelado</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {c.archivadoEn ? fmtDate(c.archivadoEn) : "-"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/convenios/${c.id}`}
                        className="text-ink underline underline-offset-4 text-xs"
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
