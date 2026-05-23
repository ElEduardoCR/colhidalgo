"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate, todayISO } from "@/lib/format";

export default function HomePage() {
  const { cuentahabientes, convenios } = useStore();

  const totalAdeudo = cuentahabientes.reduce((s, c) => s + c.saldoVencido, 0);
  const activos = convenios.filter((c) => c.estado === "activo");
  const completados = convenios.filter((c) => c.estado === "completado");

  const hoy = todayISO();
  const pagosHoy = activos.flatMap((c) =>
    c.pagos
      .filter((p) => p.fechaProgramada === hoy && p.estado !== "pagado")
      .map((p) => ({ convenio: c, pago: p })),
  );
  const vencidos = activos.flatMap((c) =>
    c.pagos
      .filter((p) => p.fechaProgramada < hoy && p.estado !== "pagado")
      .map((p) => ({ convenio: c, pago: p })),
  );

  const nombre = (id: string) =>
    cuentahabientes.find((x) => x.id === id)?.nombre ?? "Cuentahabiente";

  return (
    <>
      <PageHeader
        eyebrow="Panel general"
        title="Buen dia."
        subtitle="Resumen del estado de morosidad y convenios activos."
        actions={
          <>
            <Link href="/convenios/nuevo" className="btn-primary">
              Nuevo convenio
            </Link>
            <Link href="/morosidad" className="btn-secondary">
              Ver morosidad
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          label="Adeudo total"
          value={currency(totalAdeudo)}
          hint={`${cuentahabientes.length} cuentas con saldo`}
        />
        <Stat
          label="Convenios activos"
          value={String(activos.length)}
          hint="En curso"
        />
        <Stat
          label="Pagos para hoy"
          value={String(pagosHoy.length)}
          hint={pagosHoy.length ? "Programados" : "Sin pagos"}
        />
        <Stat
          label="Convenios completados"
          value={String(completados.length)}
          hint="Archivados"
        />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Pagos vencidos</h2>
            <Link
              href="/calendario"
              className="text-xs text-ink-soft hover:text-ink underline underline-offset-4"
            >
              Ver calendario
            </Link>
          </div>
          {vencidos.length === 0 ? (
            <p className="text-sm text-ink-mute">
              No hay pagos vencidos. Todo en orden.
            </p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {vencidos.slice(0, 5).map(({ convenio, pago }) => (
                <li
                  key={pago.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {nombre(convenio.cuentahabienteId)}
                    </div>
                    <div className="text-xs text-ink-mute">
                      Pago {pago.numero}/{convenio.numeroPagos} - {convenio.folio}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {currency(pago.monto)}
                    </div>
                    <div className="text-xs text-ink-mute">
                      {fmtDate(pago.fechaProgramada)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Pagos para hoy</h2>
            <span className="chip-line">{fmtDate(hoy)}</span>
          </div>
          {pagosHoy.length === 0 ? (
            <p className="text-sm text-ink-mute">
              No hay pagos programados para hoy.
            </p>
          ) : (
            <ul className="divide-y divide-paper-line">
              {pagosHoy.map(({ convenio, pago }) => (
                <li
                  key={pago.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {nombre(convenio.cuentahabienteId)}
                    </div>
                    <div className="text-xs text-ink-mute">
                      {convenio.folio}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {currency(pago.monto)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
