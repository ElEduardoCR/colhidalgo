"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import {
  addPeriod,
  currency,
  diaSemanaNombre,
  fmtDate,
  proximoDiaSemana,
  todayISO,
} from "@/lib/format";

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
  const [responsable, setResponsable] = useState<string>("Encargado de morosidad");
  const [observaciones, setObservaciones] = useState<string>("");
  const [recordarDiaAntes, setRecordarDiaAntes] = useState(true);
  const [recordarDiaDePago, setRecordarDiaDePago] = useState(true);

  // Estado del modo IA
  const [promptIA, setPromptIA] = useState("");
  const [interpretando, setInterpretando] = useState(false);
  const [resumenIA, setResumenIA] = useState<string | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);

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

  const interpretar = async () => {
    if (!promptIA.trim() || !cuenta) return;
    setInterpretando(true);
    setErrorIA(null);
    setResumenIA(null);
    try {
      const res = await fetch("/api/interpretar-convenio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptIA, cuentahabiente: cuenta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al interpretar.");
      const d = json.data;

      const nuevaDeuda =
        typeof d.deudaTotal === "number" && d.deudaTotal > 0
          ? d.deudaTotal
          : cuenta.saldoVencido;
      setDeudaTotal(nuevaDeuda);
      setEnganche(typeof d.enganche === "number" ? d.enganche : 0);
      if (typeof d.numeroPagos === "number" && d.numeroPagos > 0)
        setNumeroPagos(d.numeroPagos);
      if (d.periodicidad) setPeriodicidad(d.periodicidad);

      // Fecha del primer pago: dia de la semana si se indico, si no por periodo
      if (typeof d.diaSemana === "number" && d.diaSemana >= 0 && d.diaSemana <= 6) {
        setFechaPrimerPago(proximoDiaSemana(todayISO(), d.diaSemana));
      } else {
        setFechaPrimerPago(
          addPeriod(todayISO(), d.periodicidad ?? "mensual", 1),
        );
      }

      setRecordarDiaAntes(Boolean(d.recordarDiaAntes));
      setRecordarDiaDePago(Boolean(d.recordarDiaDePago));
      if (d.observaciones) setObservaciones(d.observaciones);

      // Si la IA extrajo un telefono y difiere del registrado, actualizarlo
      const tel = (d.telefono ?? "").replace(/\D/g, "");
      if (tel && tel !== (cuenta.telefono ?? "").replace(/\D/g, "")) {
        await updateCuentahabiente(cuenta.id, { telefono: tel });
      }

      const partes = [d.resumen];
      if (typeof d.diaSemana === "number")
        partes.push(`Primer pago: ${diaSemanaNombre(d.diaSemana)}.`);
      setResumenIA(partes.filter(Boolean).join(" "));
    } catch (err: any) {
      setErrorIA(err?.message ?? String(err));
    } finally {
      setInterpretando(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentahabienteId) return;
    setGuardando(true);
    try {
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
        subtitle="Describe el acuerdo en lenguaje natural y la IA llena el convenio, o captura los campos manualmente. Revisa antes de crear."
      />

      {/* Modo IA */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="chip-warn">IA</span>
          <h2 className="text-sm font-semibold">Describir el acuerdo</h2>
        </div>
        <p className="text-xs text-ink-mute mb-3">
          Ejemplo: &ldquo;El cuentahabiente quiere pagar su deuda en 6 pagos, los
          viernes. Que le avisemos por WhatsApp un dia antes y el dia de pago. Su
          numero es 5215512345678.&rdquo;
        </p>
        <div className="mb-3">
          <div className="label mb-1">Cuentahabiente</div>
          <select
            className="input"
            value={cuentahabienteId}
            onChange={(e) => cambiarCuenta(e.target.value)}
          >
            {cuentahabientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} - cuenta {c.numeroCuenta}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className="input min-h-[90px]"
          placeholder="Escribe lo que se acordo con el cuentahabiente..."
          value={promptIA}
          onChange={(e) => setPromptIA(e.target.value)}
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="text-xs">
            {errorIA && <span className="text-ink">{errorIA}</span>}
            {resumenIA && !errorIA && (
              <span className="text-ink-soft">
                <span className="font-medium">Interpretado:</span> {resumenIA}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={interpretar}
            disabled={interpretando || !promptIA.trim()}
          >
            {interpretando ? "Interpretando…" : "Interpretar con IA"}
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2 grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 text-xs text-ink-mute -mb-1">
            Revisa y ajusta los campos antes de crear el convenio.
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
            <div className="label mb-1">Recordatorios por WhatsApp</div>
            <div className="flex flex-wrap gap-4 mt-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordarDiaAntes}
                  onChange={(e) => setRecordarDiaAntes(e.target.checked)}
                />
                Avisar un dia antes
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordarDiaDePago}
                  onChange={(e) => setRecordarDiaDePago(e.target.checked)}
                />
                Avisar el dia del pago
              </label>
            </div>
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
              <dt className="text-ink-mute">Cuentahabiente</dt>
              <dd className="text-right">{cuenta?.nombre}</dd>
            </div>
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
              <dd>
                {numeroPagos} {periodicidad}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Cada pago</dt>
              <dd className="font-semibold">{currency(montoPago)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Primer pago</dt>
              <dd>{fmtDate(fechaPrimerPago)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-mute">Recordatorios</dt>
              <dd className="text-right text-xs">
                {[
                  recordarDiaAntes && "1 dia antes",
                  recordarDiaDePago && "dia de pago",
                ]
                  .filter(Boolean)
                  .join(", ") || "ninguno"}
              </dd>
            </div>
          </dl>
          <button
            type="submit"
            className="btn-primary w-full mt-5"
            disabled={guardando}
          >
            {guardando ? "Creando…" : "Crear convenio"}
          </button>
          <p className="text-[11px] text-ink-mute mt-3">
            Al crear el convenio se genera el documento oficial para imprimir o
            exportar a PDF, y el calendario de pagos con recordatorios.
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
