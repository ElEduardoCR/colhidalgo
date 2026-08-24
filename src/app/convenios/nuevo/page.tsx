"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { addPeriod, currency, fmtDate, todayISO } from "@/lib/format";

/** Plazos sugeridos para no capturar el numero de pagos a mano. */
const PLAZOS = [3, 6, 9, 12, 18, 24];

function FormNuevoConvenio() {
  const router = useRouter();
  const params = useSearchParams();
  const { cuentahabientes, createConvenio, updateCuentahabiente } = useStore();

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
  const [responsable, setResponsable] = useState<string>(
    "Encargado de morosidad",
  );
  const [observaciones, setObservaciones] = useState<string>("");
  const [telefono, setTelefono] = useState<string>(cuenta?.telefono ?? "");
  const [recordarDiaAntes, setRecordarDiaAntes] = useState(true);
  const [recordarDiaDePago, setRecordarDiaDePago] = useState(true);

  const [guardando, setGuardando] = useState(false);

  const restante = Math.max(deudaTotal - enganche, 0);
  const montoPago = useMemo(
    () => (numeroPagos > 0 ? Number((restante / numeroPagos).toFixed(2)) : 0),
    [restante, numeroPagos],
  );

  const cambiarCuenta = (id: string) => {
    setCuentahabienteId(id);
    const c = cuentahabientes.find((x) => x.id === id);
    if (c) {
      setDeudaTotal(c.saldoVencido);
      setTelefono(c.telefono ?? "");
    }
  };

  const cambiarPeriodicidad = (p: typeof periodicidad) => {
    setPeriodicidad(p);
    setFechaPrimerPago(addPeriod(todayISO(), p, 1));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentahabienteId) return;
    setGuardando(true);
    try {
      // El padron llega sin telefonos; si el encargado captura uno, se guarda
      // en la ficha del cuentahabiente para los recordatorios por WhatsApp.
      const tel = telefono.replace(/\D/g, "");
      if (cuenta && tel !== (cuenta.telefono ?? "").replace(/\D/g, "")) {
        await updateCuentahabiente(cuenta.id, { telefono: tel });
      }
      const nuevo = await createConvenio({
        cuentahabienteId,
        deudaTotal,
        enganche,
        numeroPagos,
        montoPago,
        periodicidad,
        fechaPrimerPago,
        responsable,
        observaciones,
        recordarDiaAntes,
        recordarDiaDePago,
      });
      router.push(`/convenios/${nuevo.id}`);
    } catch (err: any) {
      alert("Error al crear el convenio: " + (err?.message ?? err));
      setGuardando(false);
    }
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
        subtitle="Captura lo acordado con el cuentahabiente. Al guardar se genera el calendario de pagos y el convenio oficial para imprimir."
      />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ---- Cuentahabiente ---- */}
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-marino-900">
              Cuentahabiente
            </h2>
            <select
              className="input"
              value={cuentahabienteId}
              onChange={(e) => cambiarCuenta(e.target.value)}
            >
              {cuentahabientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — cuenta {c.numeroCuenta} —{" "}
                  {currency(c.saldoVencido)}
                </option>
              ))}
            </select>
            {cuenta && (
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="label">Domicilio</dt>
                  <dd className="mt-0.5 text-marino-800">
                    {cuenta.direccion || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="label">Adeudo del padron</dt>
                  <dd className="mt-0.5 font-semibold text-marino-900">
                    {currency(cuenta.saldoVencido)}
                  </dd>
                </div>
                <div>
                  <dt className="label">Ultimo pago</dt>
                  <dd className="mt-0.5 text-marino-800">
                    {cuenta.ultimoPago ? fmtDate(cuenta.ultimoPago) : "—"}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* ---- Condiciones ---- */}
          <section className="card grid gap-4 p-5 md:grid-cols-2">
            <h2 className="text-sm font-semibold text-marino-900 md:col-span-2">
              Condiciones del convenio
            </h2>

            <div>
              <div className="label mb-1">Deuda a convenir (MXN)</div>
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

            <div className="md:col-span-2">
              <div className="label mb-1.5">Periodicidad</div>
              <div className="flex flex-wrap gap-2">
                {(["semanal", "quincenal", "mensual"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => cambiarPeriodicidad(p)}
                    className={
                      "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition " +
                      (periodicidad === p
                        ? "bg-marino-800 text-white shadow-sm"
                        : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300 hover:text-marino-800")
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="label mb-1.5">Numero de pagos</div>
              <div className="flex flex-wrap items-center gap-2">
                {PLAZOS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumeroPagos(n)}
                    className={
                      "h-9 w-11 rounded-lg text-sm font-medium transition " +
                      (numeroPagos === n
                        ? "bg-aqua-500 text-white shadow-sm"
                        : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300 hover:text-marino-800")
                    }
                  >
                    {n}
                  </button>
                ))}
                <input
                  className="input h-9 w-24"
                  type="number"
                  min={1}
                  max={60}
                  value={numeroPagos}
                  onChange={(e) => setNumeroPagos(Number(e.target.value))}
                  required
                />
              </div>
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
                placeholder="Condiciones especiales, acuerdos verbales, etc."
              />
            </div>
          </section>

          {/* ---- Contacto y recordatorios ---- */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-marino-900">
              Contacto y recordatorios
            </h2>
            <p className="mt-1 text-xs text-pizarra-mute">
              El padron no incluye telefonos. Captura el numero aqui para poder
              mandar los avisos por WhatsApp.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="label mb-1">Telefono (con clave de pais)</div>
                <input
                  className="input"
                  inputMode="tel"
                  placeholder="5216391234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="flex flex-col justify-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-marino-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-aqua-500"
                    checked={recordarDiaAntes}
                    onChange={(e) => setRecordarDiaAntes(e.target.checked)}
                  />
                  Avisar un dia antes
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-marino-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-aqua-500"
                    checked={recordarDiaDePago}
                    onChange={(e) => setRecordarDiaDePago(e.target.checked)}
                  />
                  Avisar el dia del pago
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* ---- Resumen ---- */}
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="card-marino p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-aqua-300">
              Resumen
            </div>
            <div className="mt-3 text-sm font-medium text-white">
              {cuenta?.nombre ?? "—"}
            </div>
            <div className="text-xs text-marino-200/80">
              Cuenta {cuenta?.numeroCuenta ?? "—"}
            </div>

            <dl className="mt-5 space-y-2.5 text-sm text-marino-100">
              <div className="flex justify-between">
                <dt className="text-marino-200/80">Deuda</dt>
                <dd>{currency(deudaTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-marino-200/80">Enganche</dt>
                <dd>− {currency(enganche)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-2.5 font-medium text-white">
                <dt>A diferir</dt>
                <dd>{currency(restante)}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl bg-white/10 p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-aqua-300">
                Cada pago
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {currency(montoPago)}
              </div>
              <div className="mt-1 text-xs text-marino-200/80">
                {numeroPagos} pagos {periodicidad}es · desde el{" "}
                {fmtDate(fechaPrimerPago)}
              </div>
            </div>

            <button
              type="submit"
              className="btn-aqua mt-5 w-full"
              disabled={guardando}
            >
              {guardando ? "Creando…" : "Crear convenio"}
            </button>
            <Link
              href="/morosidad"
              className="mt-2 block text-center text-xs text-marino-200/80 hover:text-white"
            >
              Cancelar
            </Link>
          </div>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-pizarra-mute">
            Al crear el convenio se genera el documento oficial para imprimir o
            exportar a PDF y el calendario de pagos con sus recordatorios.
          </p>
        </aside>
      </form>
    </>
  );
}

export default function NuevoConvenioPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-pizarra-mute">Cargando…</div>}
    >
      <FormNuevoConvenio />
    </Suspense>
  );
}
