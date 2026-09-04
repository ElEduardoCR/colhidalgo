"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate } from "@/lib/format";
import { resumirCorte, type PagoDetalle } from "@/lib/resumenCorte";
import { IconBuscar } from "@/components/icons";

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

      <TablaPagosDelCorte pagos={r.detalle} umbral={umbralMorosidad} />
    </>
  );
}

const POR_PAGINA = 10;

/** Rango de paginas a mostrar, con elipsis cuando son muchas. */
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const ps = new Set<number>([1, total, actual]);
  if (actual > 1) ps.add(actual - 1);
  if (actual < total) ps.add(actual + 1);
  if (actual <= 3) [2, 3, 4].forEach((n) => ps.add(n));
  if (actual >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => ps.add(n));
  const orden = [...ps].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - (orden[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

function TablaPagosDelCorte({
  pagos,
  umbral,
}: {
  pagos: PagoDetalle[];
  umbral: number;
}) {
  const [q, setQ] = useState("");
  const [cond, setCond] = useState<"todos" | "moroso" | "corriente">("todos");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const term = q
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return pagos.filter((p) => {
      if (cond === "moroso" && !p.eraMoroso) return false;
      if (cond === "corriente" && p.eraMoroso) return false;
      if (!term) return true;
      const heno = `${p.nombre} ${p.numeroCuenta} ${p.idUsuario ?? ""} ${p.direccion} ${p.noMedidor}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return term.split(/\s+/).every((w) => heno.includes(w));
    });
  }, [pagos, q, cond]);

  const totalPaginas = Math.max(Math.ceil(filtrados.length / POR_PAGINA), 1);
  const actual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  const suma = filtrados.reduce((s, p) => s + p.monto, 0);

  const ir = (n: number) => setPagina(Math.min(Math.max(n, 1), totalPaginas));

  if (!pagos.length) return null;

  return (
    <section className="card mt-6 p-5">
      <h2 className="text-base font-semibold text-marino-900">
        Detalle de los pagos
      </h2>
      <p className="mb-5 mt-1 text-xs text-pizarra-mute">
        Uno por uno, los {pagos.length} pagos detectados en este corte.
      </p>

      {/* ---- Filtros ---- */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-sm">
          <IconBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra-mute" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, cuenta, id o domicilio"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["todos", `Todos (${pagos.length})`],
              ["moroso", `Morosos (${pagos.filter((p) => p.eraMoroso).length})`],
              [
                "corriente",
                `Al corriente (${pagos.filter((p) => !p.eraMoroso).length})`,
              ],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setCond(k);
                setPagina(1);
              }}
              className={
                "rounded-full px-3.5 py-2 text-xs font-semibold transition " +
                (cond === k
                  ? "bg-marino-800 text-white"
                  : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300")
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Tabla ---- */}
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pizarra-line">
              <th className="th">Id</th>
              <th className="th">Cuenta</th>
              <th className="th">Cuentahabiente</th>
              <th className="th">Tarifa</th>
              <th className="th">Fecha</th>
              <th className="th text-right">Saldo antes</th>
              <th className="th text-right">Saldo después</th>
              <th className="th text-right">Pago</th>
              <th className="th">Condición</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.cuentahabienteId} className="tr-row">
                <td className="py-3 pr-4 tabular-nums text-pizarra-mute">
                  {p.idUsuario ?? "—"}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-pizarra-soft">
                  {p.numeroCuenta}
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-marino-900">{p.nombre}</div>
                  <div className="text-xs text-pizarra-mute">{p.direccion}</div>
                </td>
                <td className="py-3 pr-4">
                  {p.tarifa ? (
                    <span className="chip-aqua">{p.tarifa}</span>
                  ) : (
                    <span className="text-pizarra-mute">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-pizarra-soft">
                  {p.fechaPago ? fmtDate(p.fechaPago) : "—"}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                  {currency(p.saldoAnterior)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                  {currency(p.saldoNuevo)}
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="tabular-nums font-semibold text-marino-900">
                    {currency(p.monto)}
                  </div>
                  {!p.exacto && (
                    <div className="text-[10px] text-aviso-ink">estimado</div>
                  )}
                </td>
                <td className="py-3 pr-0">
                  <div className="flex flex-wrap gap-1">
                    {p.eraMoroso ? (
                      <span className="chip-alerta">venia moroso</span>
                    ) : (
                      <span className="chip-aqua">al corriente</span>
                    )}
                    {p.salioDeMorosidad && (
                      <span className="chip-exito">salio de morosidad</span>
                    )}
                    {p.folioConvenio && (
                      <span className="chip-line">{p.folioConvenio}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtrados.length && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-pizarra-mute">
                  Ningun pago coincide con la busqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Paginacion ---- */}
      {filtrados.length > 0 && (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-pizarra-line pt-4 sm:flex-row">
          <div className="text-xs text-pizarra-mute">
            {(actual - 1) * POR_PAGINA + 1}–
            {Math.min(actual * POR_PAGINA, filtrados.length)} de{" "}
            {filtrados.length} pago(s) ·{" "}
            <span className="font-semibold text-marino-900">
              {currency(suma)}
            </span>
          </div>

          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                className="accion border border-pizarra-line text-pizarra-soft hover:border-aqua-300 disabled:opacity-40"
                onClick={() => ir(actual - 1)}
                disabled={actual === 1}
              >
                ‹ Anterior
              </button>
              {paginasVisibles(actual, totalPaginas).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1.5 text-xs text-pizarra-mute">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => ir(n)}
                    aria-current={n === actual ? "page" : undefined}
                    className={
                      "min-w-[2.25rem] rounded-lg px-2 py-1.5 text-xs font-semibold transition " +
                      (n === actual
                        ? "bg-marino-800 text-white"
                        : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300 hover:text-marino-800")
                    }
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                className="accion border border-pizarra-line text-pizarra-soft hover:border-aqua-300 disabled:opacity-40"
                onClick={() => ir(actual + 1)}
                disabled={actual === totalPaginas}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
