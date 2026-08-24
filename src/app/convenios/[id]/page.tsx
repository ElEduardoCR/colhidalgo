"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { addPeriod, currency, fmtDate, fmtDateLong, todayISO } from "@/lib/format";
import { IconGota, IconImprimir } from "@/components/icons";

export default function ConvenioDetallePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const {
    convenios,
    cuentahabientes,
    marcarPago,
    reestructurarConvenio,
    archivarConvenio,
    cancelarConvenio,
    eliminarConvenio,
  } = useStore();

  const convenio = convenios.find((c) => c.id === id);
  const cuenta = cuentahabientes.find((c) => c.id === convenio?.cuentahabienteId);

  const [reestructurar, setReestructurar] = useState(false);
  const [nuevoNum, setNuevoNum] = useState(3);
  const [nuevoMonto, setNuevoMonto] = useState(0);
  const [nuevaPer, setNuevaPer] = useState<"semanal" | "quincenal" | "mensual">(
    "mensual",
  );
  const [nuevaFecha, setNuevaFecha] = useState(addPeriod(todayISO(), "mensual", 1));
  const [nuevasObs, setNuevasObs] = useState("");

  const pagosResumen = useMemo(() => {
    if (!convenio) return { pagados: 0, pendientes: 0, vencidos: 0, total: 0 };
    const hoy = todayISO();
    const pagados = convenio.pagos.filter((p) => p.estado === "pagado");
    return {
      pagados: pagados.length,
      pendientes: convenio.pagos.filter(
        (p) => p.estado !== "pagado" && p.fechaProgramada >= hoy,
      ).length,
      vencidos: convenio.pagos.filter(
        (p) => p.estado !== "pagado" && p.fechaProgramada < hoy,
      ).length,
      total: pagados.reduce((s, p) => s + p.monto, 0),
    };
  }, [convenio]);

  if (!convenio || !cuenta) {
    return (
      <PageHeader
        eyebrow="Convenios"
        title="Convenio no encontrado"
        actions={
          <Link href="/convenios" className="btn-secondary">
            Volver
          </Link>
        }
      />
    );
  }

  const restanteDeuda = Math.max(
    convenio.deudaTotal - convenio.enganche - pagosResumen.total,
    0,
  );
  const archivado = convenio.estado !== "activo";
  const avance = Math.round((pagosResumen.pagados / convenio.numeroPagos) * 100);

  return (
    <>
      <PageHeader
        eyebrow={`Folio ${convenio.folio}`}
        title={cuenta.nombre}
        subtitle={`Cuenta ${cuenta.numeroCuenta} · creado el ${fmtDate(convenio.fechaCreacion)}`}
        actions={
          <>
            <button onClick={() => window.print()} className="btn-primary">
              <IconImprimir /> Imprimir / PDF
            </button>
            {!archivado && (
              <button
                className="btn-secondary"
                onClick={() => setReestructurar((v) => !v)}
              >
                {reestructurar ? "Cerrar" : "Reestructurar"}
              </button>
            )}
            {archivado ? (
              <button
                className="btn-danger"
                onClick={async () => {
                  if (
                    confirm(
                      "Eliminar definitivamente este convenio archivado? Esta accion no se puede deshacer.",
                    )
                  ) {
                    try {
                      await eliminarConvenio(convenio.id);
                      router.push("/archivo");
                    } catch (err: any) {
                      alert("Error al eliminar: " + (err?.message ?? err));
                    }
                  }
                }}
              >
                Eliminar
              </button>
            ) : (
              <button
                className="btn-ghost"
                onClick={async () => {
                  if (confirm("Cancelar este convenio?")) {
                    try {
                      await cancelarConvenio(convenio.id);
                    } catch (err: any) {
                      alert("Error al cancelar: " + (err?.message ?? err));
                    }
                  }
                }}
              >
                Cancelar
              </button>
            )}
          </>
        }
      />

      {/* ---- Avance ---- */}
      <section className="card-marino no-print mb-6 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              Avance del convenio
            </div>
            <div className="mt-1.5 text-3xl font-semibold text-white">
              {pagosResumen.pagados}
              <span className="text-xl text-marino-200/70">
                /{convenio.numeroPagos}
              </span>
              <span className="ml-2 text-base font-normal text-marino-200/80">
                pagos cubiertos
              </span>
            </div>
          </div>
          <div className="w-full md:max-w-sm">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-aqua-grad transition-all"
                style={{ width: `${avance}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-marino-200/80">
              <span>{avance}% liquidado</span>
              {convenio.estado === "activo" && pagosResumen.vencidos > 0 && (
                <span className="font-semibold text-white">
                  {pagosResumen.vencidos} pago(s) vencido(s)
                </span>
              )}
              {convenio.estado === "completado" && (
                <span className="font-semibold text-aqua-300">Completado</span>
              )}
              {convenio.estado === "cancelado" && (
                <span className="font-semibold text-white">Cancelado</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="no-print mb-6 grid gap-4 lg:grid-cols-3">
        <Stat
          label="Deuda total"
          value={currency(convenio.deudaTotal)}
          hint={`Enganche ${currency(convenio.enganche)}`}
          tono="marino"
        />
        <Stat
          label="Pagado"
          value={currency(convenio.enganche + pagosResumen.total)}
          hint={`${pagosResumen.pagados} de ${convenio.numeroPagos} pagos`}
          tono="exito"
        />
        <Stat
          label="Restante"
          value={currency(restanteDeuda)}
          hint={
            pagosResumen.vencidos > 0
              ? `${pagosResumen.vencidos} pago(s) vencido(s)`
              : "Al corriente"
          }
          tono={pagosResumen.vencidos > 0 ? "alerta" : "aqua"}
        />
      </div>

      {reestructurar && !archivado && (
        <div className="card no-print mb-6 p-5">
          <h2 className="text-sm font-semibold text-marino-900">
            Reestructurar pagos pendientes
          </h2>
          <p className="mb-4 mt-1 text-xs text-pizarra-mute">
            Se conservan los pagos ya marcados como pagados. Los pagos no
            realizados se sustituyen por una nueva secuencia.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="label mb-1">Numero de pagos restantes</div>
              <input
                className="input"
                type="number"
                min={1}
                value={nuevoNum}
                onChange={(e) => setNuevoNum(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="label mb-1">Monto por pago (MXN)</div>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(Number(e.target.value))}
              />
            </div>
            <div>
              <div className="label mb-1">Periodicidad</div>
              <select
                className="input"
                value={nuevaPer}
                onChange={(e) => setNuevaPer(e.target.value as any)}
              >
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div>
              <div className="label mb-1">Fecha del proximo pago</div>
              <input
                className="input"
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <div className="label mb-1">Observaciones</div>
              <textarea
                className="input"
                value={nuevasObs}
                onChange={(e) => setNuevasObs(e.target.value)}
                placeholder="Motivo de la reestructuracion"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setReestructurar(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await reestructurarConvenio(convenio.id, {
                    numeroPagos: nuevoNum,
                    montoPago: nuevoMonto,
                    periodicidad: nuevaPer,
                    fechaPrimerPago: nuevaFecha,
                    observaciones: nuevasObs,
                  });
                  setReestructurar(false);
                } catch (err: any) {
                  alert("Error al reestructurar: " + (err?.message ?? err));
                }
              }}
            >
              Aplicar reestructura
            </button>
          </div>
        </div>
      )}

      {/* ---- Calendario de pagos ---- */}
      <div className="card no-print mb-8 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-marino-900">
            Calendario de pagos
          </h2>
          {convenio.estado === "completado" && (
            <span className="chip-exito">Completado</span>
          )}
          {convenio.estado === "cancelado" && (
            <span className="chip-alerta">Cancelado</span>
          )}
        </div>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pizarra-line">
                <th className="th">#</th>
                <th className="th">Fecha</th>
                <th className="th text-right">Monto</th>
                <th className="th">Estado</th>
                <th className="th">Pagado el</th>
                <th className="th text-right">Accion</th>
              </tr>
            </thead>
            <tbody>
              {convenio.pagos.map((p) => {
                const vencido =
                  p.estado !== "pagado" && p.fechaProgramada < todayISO();
                return (
                  <tr key={p.id} className="tr-row">
                    <td className="py-3 pr-4 tabular-nums text-pizarra-mute">
                      {p.numero}
                    </td>
                    <td className="py-3 pr-4 text-marino-800">
                      {fmtDate(p.fechaProgramada)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-marino-900">
                      {currency(p.monto)}
                    </td>
                    <td className="py-3 pr-4">
                      {p.estado === "pagado" ? (
                        <span className="chip-exito">pagado</span>
                      ) : vencido ? (
                        <span className="chip-alerta">vencido</span>
                      ) : (
                        <span className="chip-line">pendiente</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-pizarra-soft">
                      {p.fechaPago ? fmtDate(p.fechaPago) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {p.estado === "pagado" ? (
                        <button
                          className="text-xs text-pizarra-mute underline underline-offset-4 hover:text-marino-800"
                          onClick={() =>
                            marcarPago(convenio.id, p.id, "pendiente").catch((err) =>
                              alert("Error: " + (err?.message ?? err)),
                            )
                          }
                        >
                          Revertir
                        </button>
                      ) : (
                        <button
                          className="link text-xs"
                          onClick={() =>
                            marcarPago(convenio.id, p.id, "pagado", todayISO()).catch(
                              (err) => alert("Error: " + (err?.message ?? err)),
                            )
                          }
                        >
                          Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {convenio.estado === "completado" && !convenio.archivadoEn && (
          <div className="mt-4 text-right">
            <button
              className="btn-secondary"
              onClick={() =>
                archivarConvenio(convenio.id).catch((err) =>
                  alert("Error al archivar: " + (err?.message ?? err)),
                )
              }
            >
              Archivar para auditoria
            </button>
          </div>
        )}
      </div>

      {/* ================= Documento oficial (se imprime) ================= */}
      <section className="card print-page mx-auto max-w-[8.5in] p-8 md:p-12">
        <header className="border-b-2 border-marino-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marino-800">
              <IconGota className="h-5 w-5 text-white" />
            </span>
            <div>
              <div className="text-[15px] font-semibold uppercase tracking-wide text-marino-900">
                Junta Rural de Agua Potable
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-aqua-700">
                Col. Hidalgo
              </div>
            </div>
          </div>
          <h2 className="mt-5 text-center text-xl font-semibold text-marino-900">
            Convenio de pago de adeudo
          </h2>
          <div className="mt-1 text-center text-xs text-pizarra-mute">
            Folio {convenio.folio} · {fmtDateLong(convenio.fechaCreacion)}
          </div>
        </header>

        <div className="mt-6 text-[13px] leading-7 text-pizarra-soft">
          <p>
            En la oficina de la Junta Rural de Agua Potable de Col. Hidalgo, a{" "}
            <strong className="text-marino-900">
              {fmtDateLong(convenio.fechaCreacion)}
            </strong>
            , comparecen por una parte el o la C.{" "}
            <strong className="text-marino-900">{cuenta.nombre}</strong>, titular
            de la cuenta numero{" "}
            <strong className="text-marino-900">{cuenta.numeroCuenta}</strong>,
            con domicilio en{" "}
            {cuenta.direccion || "domicilio registrado en la Junta"}, en adelante{" "}
            <strong className="text-marino-900">EL CUENTAHABIENTE</strong>; y por
            la otra parte el o la C.{" "}
            <strong className="text-marino-900">{convenio.responsable}</strong>,
            en representacion de la Junta, en adelante{" "}
            <strong className="text-marino-900">LA JUNTA</strong>, quienes
            manifiestan su voluntad de celebrar el presente convenio de pago al
            tenor de las siguientes clausulas.
          </p>

          <h3 className="mt-6 font-semibold text-marino-900">Primera. Adeudo</h3>
          <p>
            EL CUENTAHABIENTE reconoce un adeudo total con LA JUNTA por la
            cantidad de{" "}
            <strong className="text-marino-900">
              {currency(convenio.deudaTotal)}
            </strong>{" "}
            correspondiente al servicio de agua potable.
          </p>

          <h3 className="mt-4 font-semibold text-marino-900">
            Segunda. Forma de pago
          </h3>
          <p>
            EL CUENTAHABIENTE entrega en este acto la cantidad de{" "}
            <strong className="text-marino-900">
              {currency(convenio.enganche)}
            </strong>{" "}
            como enganche y se obliga a cubrir el saldo restante de{" "}
            <strong className="text-marino-900">
              {currency(restanteDeuda + pagosResumen.total)}
            </strong>{" "}
            en <strong className="text-marino-900">{convenio.numeroPagos}</strong>{" "}
            pagos <strong className="text-marino-900">{convenio.periodicidad}es</strong>{" "}
            de{" "}
            <strong className="text-marino-900">
              {currency(convenio.montoPago)}
            </strong>{" "}
            cada uno, conforme al calendario adjunto.
          </p>

          <h3 className="mt-4 font-semibold text-marino-900">
            Tercera. Incumplimiento
          </h3>
          <p>
            El incumplimiento de dos pagos consecutivos facultara a LA JUNTA a dar
            por vencido anticipadamente el presente convenio y a iniciar las
            acciones administrativas conducentes, incluida la suspension del
            servicio.
          </p>

          {convenio.observaciones && (
            <>
              <h3 className="mt-4 font-semibold text-marino-900">
                Cuarta. Observaciones
              </h3>
              <p>{convenio.observaciones}</p>
            </>
          )}

          <h3 className="mt-6 font-semibold text-marino-900">
            Calendario de pagos
          </h3>
          <table className="mt-2 w-full border border-pizarra-line text-[13px]">
            <thead>
              <tr className="bg-pizarra-fill text-marino-900">
                <th className="border-b border-pizarra-line px-3 py-2 text-left font-semibold">
                  #
                </th>
                <th className="border-b border-pizarra-line px-3 py-2 text-left font-semibold">
                  Fecha programada
                </th>
                <th className="border-b border-pizarra-line px-3 py-2 text-right font-semibold">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {convenio.pagos.map((p) => (
                <tr key={p.id} className="border-t border-pizarra-line">
                  <td className="px-3 py-1.5 tabular-nums">{p.numero}</td>
                  <td className="px-3 py-1.5">{fmtDate(p.fechaProgramada)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {currency(p.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-8">
            Leido el presente convenio por ambas partes y enteradas de su
            contenido, alcance y consecuencias legales, lo firman de conformidad.
          </p>

          <div className="mt-16 grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-marino-800 pt-2 text-xs">
                <div className="font-semibold text-marino-900">{cuenta.nombre}</div>
                <div className="text-pizarra-mute">El Cuentahabiente</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-marino-800 pt-2 text-xs">
                <div className="font-semibold text-marino-900">
                  {convenio.responsable}
                </div>
                <div className="text-pizarra-mute">Por la Junta</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
