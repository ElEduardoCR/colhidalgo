"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate, todayISO } from "@/lib/format";
import {
  IconCalendario,
  IconConvenio,
  IconGota,
  IconMorosidad,
} from "@/components/icons";

export default function HomePage() {
  const { cuentahabientes, convenios, umbralMorosidad, cortes } = useStore();

  // El padron trae a todos; morosos son los que superan el umbral configurado.
  const morosos = cuentahabientes.filter((c) => c.saldoVencido >= umbralMorosidad);
  const totalAdeudo = morosos.reduce((s, c) => s + c.saldoVencido, 0);
  const adeudoPadron = cuentahabientes.reduce((s, c) => s + c.saldoVencido, 0);
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

  // Cuentas con convenio: cuanto del adeudo ya esta bajo un acuerdo de pago.
  const conConvenio = new Set(activos.map((c) => c.cuentahabienteId));
  const adeudoEnConvenio = morosos
    .filter((c) => conConvenio.has(c.id))
    .reduce((s, c) => s + c.saldoVencido, 0);
  const cobertura = totalAdeudo
    ? Math.round((adeudoEnConvenio / totalAdeudo) * 100)
    : 0;

  const mayores = [...morosos]
    .sort((a, b) => b.saldoVencido - a.saldoVencido)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Panel general"
        title="Resumen de la cartera"
        subtitle={
          cortes.length
            ? `Padron al corte del ${fmtDate(cortes[0].fechaCorte)}.`
            : "Estado de morosidad y convenios de pago."
        }
        actions={
          <>
            <Link href="/convenios/nuevo" className="btn-primary">
              Nuevo convenio
            </Link>
            <Link href="/morosidad" className="btn-secondary">
              Ver padron
            </Link>
          </>
        }
      />

      {/* ---- Banner de cartera ---- */}
      <section className="card-marino mb-6 overflow-hidden p-6 md:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              <IconGota className="h-3.5 w-3.5" />
              Adeudo total del padron
            </div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {currency(totalAdeudo)}
            </div>
            <div className="mt-2 text-sm text-marino-200/80">
              {morosos.length} cuentas morosas (desde {currency(umbralMorosidad)})
              {" · "}
              {cuentahabientes.length} en el padron por {currency(adeudoPadron)}
            </div>
          </div>

          <div className="w-full max-w-xs">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-marino-200/80">Bajo convenio</span>
              <span className="font-semibold text-white">{cobertura}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-aqua-grad transition-all"
                style={{ width: `${cobertura}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-marino-200/70">
              {currency(adeudoEnConvenio)} en {activos.length} convenio(s)
              activo(s)
            </div>
          </div>
        </div>
      </section>

      {/* ---- Indicadores ---- */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Convenios activos"
          value={String(activos.length)}
          hint="En curso"
          tono="marino"
          icon={<IconConvenio />}
        />
        <Stat
          label="Pagos para hoy"
          value={String(pagosHoy.length)}
          hint={pagosHoy.length ? "Programados" : "Sin pagos"}
          tono="aqua"
          icon={<IconCalendario />}
        />
        <Stat
          label="Pagos vencidos"
          value={String(vencidos.length)}
          hint={
            vencidos.length
              ? currency(vencidos.reduce((s, v) => s + v.pago.monto, 0))
              : "Al corriente"
          }
          tono={vencidos.length ? "alerta" : "exito"}
          icon={<IconMorosidad />}
        />
        <Stat
          label="Convenios completados"
          value={String(completados.length)}
          hint="Archivados"
          tono="exito"
        />
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---- Vencidos ---- */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-marino-900">
              Pagos vencidos
            </h2>
            <Link href="/calendario" className="link text-xs">
              Ver calendario
            </Link>
          </div>
          {vencidos.length === 0 ? (
            <p className="py-6 text-center text-sm text-pizarra-mute">
              No hay pagos vencidos. Todo en orden.
            </p>
          ) : (
            <ul className="divide-y divide-pizarra-line">
              {vencidos.slice(0, 5).map(({ convenio, pago }) => (
                <li
                  key={pago.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-marino-900">
                      {nombre(convenio.cuentahabienteId)}
                    </div>
                    <div className="text-xs text-pizarra-mute">
                      Pago {pago.numero}/{convenio.numeroPagos} ·{" "}
                      {convenio.folio}
                    </div>
                  </div>
                  <div className="pl-3 text-right">
                    <div className="text-sm font-semibold text-alerta-ink">
                      {currency(pago.monto)}
                    </div>
                    <div className="text-xs text-pizarra-mute">
                      {fmtDate(pago.fechaProgramada)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Mayores adeudos ---- */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-marino-900">
              Mayores adeudos
            </h2>
            <Link href="/morosidad" className="link text-xs">
              Ver padron
            </Link>
          </div>
          <ul className="divide-y divide-pizarra-line">
            {mayores.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-aqua-50 text-xs font-semibold text-aqua-800">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-marino-900">
                    {c.nombre}
                  </div>
                  <div className="truncate text-xs text-pizarra-mute">
                    {c.direccion || `Cuenta ${c.numeroCuenta}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-marino-900">
                    {currency(c.saldoVencido)}
                  </div>
                  {conConvenio.has(c.id) ? (
                    <span className="chip-exito mt-0.5">con convenio</span>
                  ) : (
                    <Link
                      href={`/convenios/nuevo?cuentahabiente=${c.id}`}
                      className="link text-[11px]"
                    >
                      crear convenio
                    </Link>
                  )}
                </div>
              </li>
            ))}
            {mayores.length === 0 && (
              <li className="py-6 text-center text-sm text-pizarra-mute">
                El padron esta vacio.
              </li>
            )}
          </ul>
        </div>
      </section>

      {pagosHoy.length > 0 && (
        <section className="card mt-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-marino-900">
              Pagos para hoy
            </h2>
            <span className="chip-aqua">{fmtDate(hoy)}</span>
          </div>
          <ul className="divide-y divide-pizarra-line">
            {pagosHoy.map(({ convenio, pago }) => (
              <li
                key={pago.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="text-sm font-medium text-marino-900">
                    {nombre(convenio.cuentahabienteId)}
                  </div>
                  <div className="text-xs text-pizarra-mute">
                    {convenio.folio}
                  </div>
                </div>
                <div className="text-sm font-semibold text-marino-900">
                  {currency(pago.monto)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
