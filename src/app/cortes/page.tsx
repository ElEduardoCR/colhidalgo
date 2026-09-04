"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate } from "@/lib/format";
import { resumirCorte } from "@/lib/resumenCorte";

export default function CortesPage() {
  const { cortes, movimientos, cuentahabientes, convenios, umbralMorosidad } =
    useStore();
  const [sel, setSel] = useState<string>("");

  const corte = cortes.find((c) => c.id === sel) ?? cortes[0];

  const r = useMemo(
    () =>
      corte
        ? resumirCorte(
            corte,
            cortes,
            movimientos,
            cuentahabientes,
            convenios,
            umbralMorosidad,
          )
        : null,
    [corte, cortes, movimientos, cuentahabientes, convenios, umbralMorosidad],
  );

  if (!cortes.length) {
    return (
      <>
        <PageHeader
          eyebrow="Padron"
          title="Cortes"
          subtitle="Todavia no hay cortes importados."
        />
        <div className="card p-14 text-center">
          <p className="text-sm text-pizarra-mute">
            Sube el primer reporte para empezar a comparar.
          </p>
          <Link href="/importar" className="btn-primary mt-4 inline-flex">
            Importar corte
          </Link>
        </div>
      </>
    );
  }

  if (!r) return null;

  const pct = (n: number) => (r.pagos.total ? (n / r.pagos.total) * 100 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Padron"
        title="Detalle de cortes"
        subtitle={
          r.anterior
            ? `Que cambio entre el corte del ${fmtDate(r.anterior.fechaCorte)} y el del ${fmtDate(r.corte.fechaCorte)}.`
            : `Corte del ${fmtDate(r.corte.fechaCorte)}. Es el primero, no hay contra que compararlo.`
        }
        actions={
          <select
            className="input w-auto"
            value={corte.id}
            onChange={(e) => setSel(e.target.value)}
          >
            {cortes.map((c) => (
              <option key={c.id} value={c.id}>
                {fmtDate(c.fechaCorte)} — {c.pagosDetectados} pago(s)
              </option>
            ))}
          </select>
        }
      />

      {/* ---- Encabezado del corte ---- */}
      <section className="card-marino mb-6 p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              Cobrado en el periodo
            </div>
            <div className="mt-1.5 text-3xl font-semibold text-white">
              {currency(r.pagos.monto)}
            </div>
            <div className="mt-1 text-xs text-marino-200/80">
              {r.pagos.total} pago(s) detectado(s)
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              Adeudo del padron
            </div>
            <div className="mt-1.5 text-3xl font-semibold text-white">
              {currency(r.padron.adeudo)}
            </div>
            <div className="mt-1 text-xs text-marino-200/80">
              {r.padron.variacionAdeudo === 0
                ? `${r.padron.cuentas} cuentas`
                : `${r.padron.variacionAdeudo < 0 ? "↓" : "↑"} ${currency(Math.abs(r.padron.variacionAdeudo))} contra el corte anterior`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              Cuentas
            </div>
            <div className="mt-1.5 text-3xl font-semibold text-white">
              {r.padron.cuentas}
            </div>
            <div className="mt-1 text-xs text-marino-200/80">
              {r.corte.altas > 0 ? `${r.corte.altas} alta(s) nueva(s)` : "sin altas"}
              {r.padron.variacionCuentas !== 0 &&
                ` · ${r.padron.variacionCuentas > 0 ? "+" : ""}${r.padron.variacionCuentas}`}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Quien pago: al corriente vs moroso ---- */}
      <section className="card mb-6 p-5">
        <h2 className="text-base font-semibold text-marino-900">
          Quien pago en este periodo
        </h2>
        <p className="mb-5 mt-1 text-xs text-pizarra-mute">
          Se clasifica por el saldo que traian <strong>antes</strong> de pagar,
          contra el umbral de {currency(umbralMorosidad)}.
        </p>

        {r.pagos.total === 0 ? (
          <p className="py-8 text-center text-sm text-pizarra-mute">
            No se detectaron pagos en este corte.
          </p>
        ) : (
          <>
            <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-pizarra-fill">
              <div
                className="bg-aqua-500"
                style={{ width: `${pct(r.pagos.alCorriente.n)}%` }}
                title="Al corriente"
              />
              <div
                className="bg-alerta"
                style={{ width: `${pct(r.pagos.morosos.n)}%` }}
                title="Morosos"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-aqua-200 bg-aqua-50/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-aqua-500" />
                  <span className="text-sm font-semibold text-marino-900">
                    Estaban al corriente
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-marino-900">
                  {r.pagos.alCorriente.n}
                  <span className="ml-2 text-sm font-normal text-pizarra-mute">
                    de {r.pagos.total} pagos
                  </span>
                </div>
                <div className="mt-1 text-sm text-pizarra-soft">
                  {currency(r.pagos.alCorriente.monto)}
                  {r.pagos.alCorriente.n > 0 && (
                    <span className="text-pizarra-mute">
                      {" "}
                      · {currency(r.pagos.alCorriente.monto / r.pagos.alCorriente.n)}{" "}
                      en promedio
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-pizarra-mute">
                  Debian menos de {currency(umbralMorosidad)}: pagaron su recibo
                  normal.
                </p>
              </div>

              <div className="rounded-xl border border-alerta/25 bg-alerta-soft p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-alerta" />
                  <span className="text-sm font-semibold text-marino-900">
                    Venian morosos
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-marino-900">
                  {r.pagos.morosos.n}
                  <span className="ml-2 text-sm font-normal text-pizarra-mute">
                    de {r.pagos.total} pagos
                  </span>
                </div>
                <div className="mt-1 text-sm text-pizarra-soft">
                  {currency(r.pagos.morosos.monto)}
                  {r.pagos.morosos.n > 0 && (
                    <span className="text-pizarra-mute">
                      {" "}
                      · {currency(r.pagos.morosos.monto / r.pagos.morosos.n)} en
                      promedio
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-pizarra-soft">
                  <strong className="text-exito-ink">
                    {r.pagos.salieronDeMorosidad} salieron de morosidad
                  </strong>
                  {r.pagos.siguenMorosos > 0 && (
                    <> · {r.pagos.siguenMorosos} siguen debiendo</>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Monto exacto"
                value={String(r.pagos.exactos)}
                hint="Resta limpia de saldos"
                tono="exito"
              />
              <Stat
                label="Monto estimado"
                value={String(r.pagos.estimados)}
                hint="Se sumo el cargo del periodo"
                tono={r.pagos.estimados ? "aviso" : "marino"}
              />
              <Stat
                label="Descartados"
                value={String(r.pagos.descartados)}
                hint="Requerian captura manual"
                tono="marino"
              />
              <Stat
                label="Morosos hoy"
                value={String(r.padron.morosos)}
                hint={`Desde ${currency(umbralMorosidad)}`}
                tono="alerta"
              />
            </div>

            {r.pagos.porTarifa.length > 0 && (
              <div className="mt-5">
                <div className="label mb-2">Por tarifa</div>
                <div className="flex flex-wrap gap-2">
                  {r.pagos.porTarifa.map((t) => (
                    <span key={t.tarifa} className="chip-aqua">
                      {t.tarifa} · {t.n} pago(s) · {currency(t.monto)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ---- Convenios ---- */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-marino-900">
          Cumplimiento de convenios
        </h2>
        <p className="mb-5 mt-1 text-xs text-pizarra-mute">
          Letras que se acreditaron en este corte y las que ya vencieron sin
          pagarse a la fecha del corte.
        </p>

        {r.convenios.acreditadas.length > 0 && (
          <div className="mb-6">
            <div className="label mb-2">Acreditadas en este corte</div>
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pizarra-line">
                    <th className="th">Cuentahabiente</th>
                    <th className="th">Letra</th>
                    <th className="th">Vencia</th>
                    <th className="th">Pago</th>
                    <th className="th text-right">Acordado</th>
                    <th className="th text-right">Pagado</th>
                    <th className="th text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {r.convenios.acreditadas.map((a, i) => (
                    <tr key={i} className="tr-row">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-marino-900">{a.nombre}</div>
                        <div className="font-mono text-[11px] text-pizarra-mute">
                          {a.folio}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-pizarra-soft">
                        {a.numero}/{a.totalLetras}
                      </td>
                      <td className="py-3 pr-4 text-pizarra-soft">
                        {fmtDate(a.fechaProgramada)}
                      </td>
                      <td className="py-3 pr-4">
                        {a.fechaPago ? fmtDate(a.fechaPago) : "—"}
                        {a.diasAtraso > 0 && (
                          <div>
                            <span className="chip-aviso mt-1">
                              {a.diasAtraso} d de atraso
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                        {currency(a.montoAcordado)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium text-marino-900">
                        {currency(a.montoPagado)}
                      </td>
                      <td className="py-3 text-right">
                        {Math.abs(a.diferencia) < 0.01 ? (
                          <span className="chip-exito">exacto</span>
                        ) : a.diferencia < 0 ? (
                          <span className="chip-alerta">
                            faltan {currency(-a.diferencia)}
                          </span>
                        ) : (
                          <span className="chip-aqua">
                            + {currency(a.diferencia)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="label mb-2">Letras vencidas sin pagar</div>
        {r.convenios.vencidas.length === 0 ? (
          <p className="rounded-xl bg-exito-soft py-6 text-center text-sm text-exito-ink">
            Ningun convenio tiene letras vencidas a la fecha de este corte.
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pizarra-line">
                  <th className="th">Cuentahabiente</th>
                  <th className="th">Letra</th>
                  <th className="th">Vencio</th>
                  <th className="th text-right">Monto</th>
                  <th className="th">Atraso</th>
                  <th className="th text-right">Convenio</th>
                </tr>
              </thead>
              <tbody>
                {r.convenios.vencidas.map((v, i) => (
                  <tr key={i} className="tr-row">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-marino-900">{v.nombre}</div>
                      <div className="font-mono text-[11px] text-pizarra-mute">
                        {v.folio}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-pizarra-soft">
                      {v.numero}/{v.totalLetras}
                    </td>
                    <td className="py-3 pr-4 text-pizarra-soft">
                      {fmtDate(v.fechaProgramada)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-medium text-marino-900">
                      {currency(v.monto)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          v.diasAtraso === 0
                            ? "chip-line"
                            : v.diasAtraso > 30
                              ? "chip-alerta"
                              : "chip-aviso"
                        }
                      >
                        {v.diasAtraso === 0
                          ? "vence ese dia"
                          : `${v.diasAtraso} dia(s)`}
                      </span>
                      {v.pagoEnEsteCorte && (
                        <div>
                          <span className="chip-aqua mt-1" title="Registro un pago en este corte que no se acredito a la letra">
                            pago sin acreditar
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/convenios/${v.convenioId}`} className="accion link">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
