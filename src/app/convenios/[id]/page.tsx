"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { addPeriod, currency, fmtDate, fmtDateLong, todayISO } from "@/lib/format";

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
  const cuenta = cuentahabientes.find(
    (c) => c.id === convenio?.cuentahabienteId,
  );

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
    const pendientes = convenio.pagos.filter(
      (p) => p.estado !== "pagado" && p.fechaProgramada >= hoy,
    );
    const vencidos = convenio.pagos.filter(
      (p) => p.estado !== "pagado" && p.fechaProgramada < hoy,
    );
    return {
      pagados: pagados.length,
      pendientes: pendientes.length,
      vencidos: vencidos.length,
      total: pagados.reduce((s, p) => s + p.monto, 0),
    };
  }, [convenio]);

  if (!convenio || !cuenta) {
    return (
      <>
        <PageHeader
          eyebrow="Convenios"
          title="Convenio no encontrado"
          actions={
            <Link href="/convenios" className="btn-secondary">
              Volver
            </Link>
          }
        />
      </>
    );
  }

  const pagado = convenio.pagos.filter((p) => p.estado === "pagado");
  const restanteDeuda = Math.max(
    convenio.deudaTotal - convenio.enganche - pagosResumen.total,
    0,
  );
  const archivado = convenio.estado !== "activo";

  return (
    <>
      <PageHeader
        eyebrow={`Folio ${convenio.folio}`}
        title={cuenta.nombre}
        subtitle={`Cuenta ${cuenta.numeroCuenta} - creado el ${fmtDate(convenio.fechaCreacion)}`}
        actions={
          <>
            <button onClick={() => window.print()} className="btn-secondary">
              Imprimir / PDF
            </button>
            {!archivado && (
              <button
                className="btn-ghost"
                onClick={() => setReestructurar((v) => !v)}
              >
                {reestructurar ? "Cerrar" : "Reestructurar"}
              </button>
            )}
            {archivado ? (
              <button
                className="btn-danger"
                onClick={() => {
                  if (
                    confirm(
                      "Eliminar definitivamente este convenio archivado? Esta accion no se puede deshacer.",
                    )
                  ) {
                    eliminarConvenio(convenio.id);
                    router.push("/archivo");
                  }
                }}
              >
                Eliminar
              </button>
            ) : (
              <button
                className="btn-ghost"
                onClick={() => {
                  if (confirm("Cancelar este convenio?")) {
                    cancelarConvenio(convenio.id);
                  }
                }}
              >
                Cancelar
              </button>
            )}
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="label">Deuda total</div>
          <div className="text-xl font-semibold mt-1">
            {currency(convenio.deudaTotal)}
          </div>
          <div className="text-xs text-ink-mute mt-1">
            Enganche {currency(convenio.enganche)}
          </div>
        </div>
        <div className="card p-4">
          <div className="label">Pagado</div>
          <div className="text-xl font-semibold mt-1">
            {currency(convenio.enganche + pagosResumen.total)}
          </div>
          <div className="text-xs text-ink-mute mt-1">
            {pagosResumen.pagados} de {convenio.numeroPagos} pagos
          </div>
        </div>
        <div className="card p-4">
          <div className="label">Restante</div>
          <div className="text-xl font-semibold mt-1">
            {currency(restanteDeuda)}
          </div>
          <div className="text-xs text-ink-mute mt-1">
            {pagosResumen.vencidos > 0
              ? `${pagosResumen.vencidos} pago(s) vencido(s)`
              : "Al corriente"}
          </div>
        </div>
      </div>

      {reestructurar && !archivado && (
        <div className="card p-5 mb-6">
          <div className="text-sm font-semibold mb-3">
            Reestructurar pagos pendientes
          </div>
          <p className="text-xs text-ink-mute mb-4">
            Se conservaran los pagos ya marcados como pagados. Se sustituiran los
            pagos no pagados por una nueva secuencia.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
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
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn-ghost"
              onClick={() => setReestructurar(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                reestructurarConvenio(convenio.id, {
                  numeroPagos: nuevoNum,
                  montoPago: nuevoMonto,
                  periodicidad: nuevaPer,
                  fechaPrimerPago: nuevaFecha,
                  observaciones: nuevasObs,
                });
                setReestructurar(false);
              }}
            >
              Aplicar reestructura
            </button>
          </div>
        </div>
      )}

      <div className="card p-5 mb-6 no-print">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Calendario de pagos</h2>
          {convenio.estado === "completado" && (
            <span className="chip-warn">Completado</span>
          )}
          {convenio.estado === "cancelado" && (
            <span className="chip-line">Cancelado</span>
          )}
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-mute border-b border-paper-line">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Monto</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Pagado el</th>
                <th className="py-2 font-medium text-right">Accion</th>
              </tr>
            </thead>
            <tbody>
              {convenio.pagos.map((p) => {
                const vencido =
                  p.estado !== "pagado" && p.fechaProgramada < todayISO();
                return (
                  <tr
                    key={p.id}
                    className="border-b border-paper-line last:border-0"
                  >
                    <td className="py-3 pr-4">{p.numero}</td>
                    <td className="py-3 pr-4">{fmtDate(p.fechaProgramada)}</td>
                    <td className="py-3 pr-4">{currency(p.monto)}</td>
                    <td className="py-3 pr-4">
                      {p.estado === "pagado" ? (
                        <span className="chip-warn">pagado</span>
                      ) : vencido ? (
                        <span className="chip-warn">vencido</span>
                      ) : (
                        <span className="chip-line">pendiente</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {p.fechaPago ? fmtDate(p.fechaPago) : "-"}
                    </td>
                    <td className="py-3 text-right">
                      {p.estado === "pagado" ? (
                        <button
                          className="text-xs text-ink-soft underline underline-offset-4"
                          onClick={() =>
                            marcarPago(convenio.id, p.id, "pendiente")
                          }
                        >
                          Revertir
                        </button>
                      ) : (
                        <button
                          className="text-xs text-ink underline underline-offset-4"
                          onClick={() =>
                            marcarPago(convenio.id, p.id, "pagado", todayISO())
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
              onClick={() => archivarConvenio(convenio.id)}
            >
              Archivar para auditoria
            </button>
          </div>
        )}
      </div>

      {/* Documento oficial - se imprime */}
      <section className="card p-10 print-page max-w-[8.5in] mx-auto">
        <header className="text-center border-b border-paper-line pb-6">
          <div className="text-xs uppercase tracking-widest text-ink-mute">
            Junta Rural de Agua y Saneamiento
          </div>
          <h2 className="text-2xl font-semibold mt-2">
            Convenio de pago de adeudo
          </h2>
          <div className="text-xs text-ink-mute mt-2">
            Folio {convenio.folio} - {fmtDateLong(convenio.fechaCreacion)}
          </div>
        </header>

        <div className="mt-6 text-sm leading-7 text-ink-soft">
          <p>
            En la oficina de la Junta Rural de Agua y Saneamiento, a{" "}
            <strong>{fmtDateLong(convenio.fechaCreacion)}</strong>, comparecen
            por una parte el o la C. <strong>{cuenta.nombre}</strong>, titular
            de la cuenta numero <strong>{cuenta.numeroCuenta}</strong>, con
            domicilio en {cuenta.direccion || "domicilio registrado en la Junta"},
            en adelante <strong>EL CUENTAHABIENTE</strong>; y por la otra parte
            el o la C. <strong>{convenio.responsable}</strong>, en
            representacion de la Junta, en adelante <strong>LA JUNTA</strong>,
            quienes manifiestan su voluntad de celebrar el presente convenio de
            pago al tenor de las siguientes clausulas.
          </p>

          <h3 className="font-semibold text-ink mt-6">Primera. Adeudo</h3>
          <p>
            EL CUENTAHABIENTE reconoce un adeudo total con LA JUNTA por la
            cantidad de <strong>{currency(convenio.deudaTotal)}</strong>{" "}
            correspondiente al servicio de agua potable.
          </p>

          <h3 className="font-semibold text-ink mt-4">Segunda. Forma de pago</h3>
          <p>
            EL CUENTAHABIENTE entrega en este acto la cantidad de{" "}
            <strong>{currency(convenio.enganche)}</strong> como enganche y se
            obliga a cubrir el saldo restante de{" "}
            <strong>{currency(restanteDeuda + pagosResumen.total)}</strong> en{" "}
            <strong>{convenio.numeroPagos}</strong> pagos{" "}
            <strong>{convenio.periodicidad}</strong> de{" "}
            <strong>{currency(convenio.montoPago)}</strong> cada uno, conforme
            al calendario adjunto.
          </p>

          <h3 className="font-semibold text-ink mt-4">Tercera. Incumplimiento</h3>
          <p>
            El incumplimiento de dos pagos consecutivos facultara a LA JUNTA a
            dar por vencido anticipadamente el presente convenio y a iniciar las
            acciones administrativas conducentes, incluida la suspension del
            servicio.
          </p>

          {convenio.observaciones && (
            <>
              <h3 className="font-semibold text-ink mt-4">
                Cuarta. Observaciones
              </h3>
              <p>{convenio.observaciones}</p>
            </>
          )}

          <h3 className="font-semibold text-ink mt-6">Calendario de pagos</h3>
          <table className="w-full text-sm border border-paper-line mt-2">
            <thead>
              <tr className="bg-paper-mute text-ink">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Fecha programada</th>
                <th className="px-3 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {convenio.pagos.map((p) => (
                <tr key={p.id} className="border-t border-paper-line">
                  <td className="px-3 py-1.5">{p.numero}</td>
                  <td className="px-3 py-1.5">{fmtDate(p.fechaProgramada)}</td>
                  <td className="px-3 py-1.5 text-right">
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

          <div className="grid grid-cols-2 gap-12 mt-16">
            <div className="text-center">
              <div className="border-t border-ink-soft pt-2 text-xs">
                <div className="font-medium text-ink">{cuenta.nombre}</div>
                <div className="text-ink-mute">El Cuentahabiente</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-ink-soft pt-2 text-xs">
                <div className="font-medium text-ink">
                  {convenio.responsable}
                </div>
                <div className="text-ink-mute">Por la Junta</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
