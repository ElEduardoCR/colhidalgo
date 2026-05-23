"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { addPeriod, currency, fmtDate, todayISO } from "@/lib/format";

function FormNuevoConvenio() {
  const router = useRouter();
  const params = useSearchParams();
  const { cuentahabientes, createConvenio } = useStore();

  const inicial = params.get("cuentahabiente") ?? cuentahabientes[0]?.id ?? "";

  const [cuentahabienteId, setCuentahabienteId] = useState(inicial);
  const cuenta = cuentahabientes.find((c) => c.id === cuentahabienteId);

  const [deudaTotal, setDeudaTotal] = useState<number>(cuenta?.saldoVencido ?? 0);
  const [enganche, setEnganche] = useState<number>(0);
  const [numeroPagos, setNumeroPagos] = useState<number>(6);
  const [periodicidad, setPeriodicidad] = useState<
    "semanal" | "quincenal" | "mensual"
  >("mensual");
  const [fechaPrimerPago, setFechaPrimerPago] = useState<string>(
    addPeriod(todayISO(), "mensual", 1),
  );
  const [responsable, setResponsable] = useState<string>("Encargado de morosidad");
  const [observaciones, setObservaciones] = useState<string>("");

  const restante = Math.max(deudaTotal - enganche, 0);
  const montoPago = useMemo(
    () => (numeroPagos > 0 ? Number((restante / numeroPagos).toFixed(2)) : 0),
    [restante, numeroPagos],
  );

  const cambiarCuenta = (id: string) => {
    setCuentahabienteId(id);
    const c = cuentahabientes.find((x) => x.id === id);
    if (c) setDeudaTotal(c.saldoVencido);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentahabienteId) return;
    const nuevo = createConvenio({
      cuentahabienteId,
      deudaTotal,
      enganche,
      numeroPagos,
      montoPago,
      periodicidad,
      fechaPrimerPago,
      responsable,
      observaciones,
    });
    router.push(`/convenios/${nuevo.id}`);
  };

  if (cuentahabientes.length === 0) {
    return (
      <PageHeader
        eyebrow="Convenios"
        title="Nuevo convenio"
        subtitle="Primero registra al menos una cuenta en Morosidad."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Convenios"
        title="Nuevo convenio de pago"
        subtitle="Llena la informacion acordada con el cuentahabiente. Al guardar se generara el documento oficial para firma."
      />

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="label mb-1">Cuentahabiente</div>
            <select
              className="input"
              value={cuentahabienteId}
              onChange={(e) => cambiarCuenta(e.target.value)}
              required
            >
              {cuentahabientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} - cuenta {c.numeroCuenta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="label mb-1">Deuda total (MXN)</div>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={deudaTotal}
              onChange={(e) => setDeudaTotal(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Enganche (MXN)</div>
            <input
              className="input"
              type="number"
              min={0}
              max={deudaTotal}
              step="0.01"
              value={enganche}
              onChange={(e) => setEnganche(Number(e.target.value))}
            />
          </div>

          <div>
            <div className="label mb-1">Numero de pagos</div>
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              value={numeroPagos}
              onChange={(e) => setNumeroPagos(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Periodicidad</div>
            <select
              className="input"
              value={periodicidad}
              onChange={(e) => setPeriodicidad(e.target.value as any)}
            >
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div>
            <div className="label mb-1">Fecha del primer pago</div>
            <input
              className="input"
              type="date"
              value={fechaPrimerPago}
              onChange={(e) => setFechaPrimerPago(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Responsable por la Junta</div>
            <input
              className="input"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <div className="label mb-1">Observaciones</div>
            <textarea
              className="input min-h-[80px]"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales, condiciones especiales, etc."
            />
          </div>
        </div>

        <aside className="card p-5 h-fit">
          <div className="text-sm font-semibold mb-3">Resumen</div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-mute">Deuda total</dt>
              <dd>{currency(deudaTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Enganche</dt>
              <dd>- {currency(enganche)}</dd>
            </div>
            <div className="flex justify-between border-t border-paper-line pt-2 font-medium">
              <dt>A diferir</dt>
              <dd>{currency(restante)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Pagos</dt>
              <dd>{numeroPagos}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Cada pago</dt>
              <dd className="font-semibold">{currency(montoPago)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Primer pago</dt>
              <dd>{fmtDate(fechaPrimerPago)}</dd>
            </div>
          </dl>
          <button type="submit" className="btn-primary w-full mt-5">
            Crear convenio
          </button>
          <p className="text-[11px] text-ink-mute mt-3">
            Al crear el convenio podras imprimirlo o exportarlo como PDF desde la
            opcion <span className="font-medium">Imprimir</span> del navegador.
          </p>
        </aside>
      </form>
    </>
  );
}

export default function NuevoConvenioPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-mute">Cargando…</div>}>
      <FormNuevoConvenio />
    </Suspense>
  );
}
