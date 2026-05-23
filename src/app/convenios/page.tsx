"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate } from "@/lib/format";

export default function ConveniosPage() {
  const { convenios, cuentahabientes } = useStore();
  const activos = convenios.filter((c) => c.estado === "activo");

  const nombre = (id: string) =>
    cuentahabientes.find((x) => x.id === id)?.nombre ?? "-";

  return (
    <>
      <PageHeader
        eyebrow="Convenios"
        title="Convenios activos"
        subtitle="Gestion de los convenios de pago vigentes."
        actions={
          <Link href="/convenios/nuevo" className="btn-primary">
            Nuevo convenio
          </Link>
        }
      />

      <div className="card p-5">
        {activos.length === 0 ? (
          <div className="text-center py-12 text-ink-mute">
            <p className="text-sm">Aun no hay convenios activos.</p>
            <Link
              href="/convenios/nuevo"
              className="text-ink underline underline-offset-4 text-sm mt-2 inline-block"
            >
              Crear el primero
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-mute border-b border-paper-line">
                  <th className="py-2 pr-4 font-medium">Folio</th>
                  <th className="py-2 pr-4 font-medium">Cuentahabiente</th>
                  <th className="py-2 pr-4 font-medium">Deuda</th>
                  <th className="py-2 pr-4 font-medium">Pagos</th>
                  <th className="py-2 pr-4 font-medium">Avance</th>
                  <th className="py-2 pr-4 font-medium">Siguiente pago</th>
                  <th className="py-2 font-medium text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((c) => {
                  const pagados = c.pagos.filter(
                    (p) => p.estado === "pagado",
                  ).length;
                  const siguiente = c.pagos.find((p) => p.estado !== "pagado");
                  return (
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
                        {currency(c.montoPago)} x {c.numeroPagos}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-paper-mute overflow-hidden">
                            <div
                              className="h-full bg-ink"
                              style={{
                                width: `${(pagados / c.numeroPagos) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-ink-soft">
                            {pagados}/{c.numeroPagos}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {siguiente ? fmtDate(siguiente.fechaProgramada) : "-"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
