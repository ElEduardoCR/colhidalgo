"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore, type AplicacionCorte } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate, todayISO } from "@/lib/format";
import { conciliar, type Conciliacion, type PagoDetectado } from "@/lib/conciliar";
import { ErrorImportacion, leerArchivoCorte } from "@/lib/importar";
import type { Convenio, Corte, Cuentahabiente, Movimiento } from "@/lib/types";
import { IconGota } from "@/components/icons";

type Pestana = "pagos" | "altas" | "cambios" | "ausentes";

/** Decision del encargado sobre cada pago detectado. */
type Decision = { incluir: boolean; monto: number; acreditar: boolean };

export default function ImportarPage() {
  const { cuentahabientes, convenios, cortes, aplicarCorte, deshacerCorte } =
    useStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<string>("");
  const [conc, setConc] = useState<Conciliacion | null>(null);
  const [filas, setFilas] = useState<Awaited<
    ReturnType<typeof leerArchivoCorte>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("pagos");
  const [decisiones, setDecisiones] = useState<Record<string, Decision>>({});
  const [listo, setListo] = useState<string | null>(null);
  const [deshaciendo, setDeshaciendo] = useState<string | null>(null);

  const yaImportado = useMemo(
    () => (conc ? cortes.some((c) => c.fechaCorte === conc.fechaCorte) : false),
    [cortes, conc],
  );

  /** Convenio activo de una cuenta y su siguiente letra sin pagar. */
  const siguienteLetra = useMemo(() => {
    const m = new Map<
      string,
      {
        convenio: Convenio;
        pagoId: string;
        numero: number;
        monto: number;
        fechaProgramada: string;
      }
    >();
    for (const c of convenios) {
      if (c.estado !== "activo") continue;
      const p = c.pagos.find((x) => x.estado !== "pagado");
      if (p)
        m.set(c.cuentahabienteId, {
          convenio: c,
          pagoId: p.id,
          numero: p.numero,
          monto: p.monto,
          fechaProgramada: p.fechaProgramada,
        });
    }
    return m;
  }, [convenios]);

  const elegirArchivo = async (file: File) => {
    setError(null);
    setListo(null);
    setLeyendo(true);
    try {
      const leido = await leerArchivoCorte(file);
      const c = conciliar(leido.filas, cuentahabientes, leido.fechaCorte);
      setFilas(leido);
      setConc(c);
      setArchivo(file.name);
      setPestana("pagos");
      setDecisiones(
        Object.fromEntries(
          c.pagos.map((p) => [
            p.cuentahabienteId,
            {
              // Un monto en cero no se puede registrar: hay que capturarlo.
              incluir: p.montoDetectado > 0,
              monto: p.montoDetectado,
              acreditar: siguienteLetra.has(p.cuentahabienteId),
            },
          ]),
        ),
      );
    } catch (e: any) {
      setConc(null);
      setFilas(null);
      setError(
        e instanceof ErrorImportacion
          ? e.message
          : (e?.message ?? "No se pudo procesar el archivo."),
      );
    } finally {
      setLeyendo(false);
    }
  };

  const incluidos = useMemo(
    () => (conc ? conc.pagos.filter((p) => decisiones[p.cuentahabienteId]?.incluir) : []),
    [conc, decisiones],
  );
  const totalIncluido = incluidos.reduce(
    (s, p) => s + (decisiones[p.cuentahabienteId]?.monto ?? 0),
    0,
  );

  const setDec = (id: string, patch: Partial<Decision>) =>
    setDecisiones((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const aplicar = async () => {
    if (!conc || !filas) return;
    setGuardando(true);
    setError(null);
    try {
      const corteId = `corte-${conc.fechaCorte}-${Date.now()}`;
      const previas = new Map(cuentahabientes.map((c) => [c.numeroCuenta, c]));

      // Padron: se conserva lo que el reporte no trae (telefono, correo, notas).
      const cuentas: Cuentahabiente[] = filas.filas.map((f) => {
        const p = previas.get(f.numeroCuenta);
        return {
          id: p?.id ?? `cta-${f.idUsuario || f.numeroCuenta}`,
          idUsuario: f.idUsuario || p?.idUsuario,
          nombre: f.nombre,
          numeroCuenta: f.numeroCuenta,
          direccion: f.direccion,
          telefono: p?.telefono ?? "",
          email: p?.email ?? "",
          saldoVencido: f.adeudo,
          mesesAdeudo: mesesDesde(f.ultimoPago, conc.fechaCorte),
          ultimoPago: f.ultimoPago ?? "",
          tarifa: f.tarifa,
          noMedidor: f.noMedidor,
          ruta: f.ruta,
          secuencia: f.secuencia,
          consumo: f.consumo,
          observaciones: p?.observaciones ?? "",
          fechaCorte: conc.fechaCorte,
          activo: true,
        };
      });

      const movimientos: Movimiento[] = conc.pagos.map((p) => {
        const d = decisiones[p.cuentahabienteId];
        const letra = d?.acreditar ? siguienteLetra.get(p.cuentahabienteId) : undefined;
        return {
          id: `mov-${corteId}-${p.cuentahabienteId}`,
          corteId,
          cuentahabienteId: p.cuentahabienteId,
          fechaPago: p.fechaPago,
          saldoAnterior: p.saldoAnterior,
          saldoNuevo: p.saldoNuevo,
          cargoEstimado: p.cargoEstimado,
          montoDetectado: p.montoDetectado,
          montoConfirmado: d?.incluir ? d.monto : undefined,
          origen: p.origen,
          estado: d?.incluir ? "confirmado" : "descartado",
          pagoConvenioId: d?.incluir ? letra?.pagoId : undefined,
        };
      });

      const creditos = conc.pagos.flatMap((p) => {
        const d = decisiones[p.cuentahabienteId];
        const letra = siguienteLetra.get(p.cuentahabienteId);
        return d?.incluir && d.acreditar && letra
          ? [{ convenioId: letra.convenio.id, pagoId: letra.pagoId, fechaPago: p.fechaPago ?? todayISO() }]
          : [];
      });

      const corte: Corte = {
        id: corteId,
        fechaCorte: conc.fechaCorte,
        archivo,
        totalCuentas: conc.totalCuentas,
        totalAdeudo: conc.totalAdeudo,
        altas: conc.altas.length,
        pagosDetectados: incluidos.length,
        montoDetectado: Math.round(totalIncluido * 100) / 100,
      };

      const detalle = filas.filas.map((f) => ({
        numeroCuenta: f.numeroCuenta,
        idUsuario: f.idUsuario,
        nombre: f.nombre,
        direccion: f.direccion,
        noMedidor: f.noMedidor,
        ruta: f.ruta,
        secuencia: f.secuencia,
        ultimoPago: f.ultimoPago,
        tarifa: f.tarifa,
        adeudo: f.adeudo,
        mesesAdeudo: mesesDesde(f.ultimoPago, conc.fechaCorte),
        consumo: f.consumo,
      }));

      const payload: AplicacionCorte = {
        corte,
        cuentas,
        detalle,
        movimientos,
        creditos,
      };
      await aplicarCorte(payload);

      setListo(
        `Corte del ${fmtDate(conc.fechaCorte)} aplicado: ${cuentas.length} cuentas, ` +
          `${incluidos.length} pago(s) por ${currency(totalIncluido)}` +
          (creditos.length ? `, ${creditos.length} letra(s) de convenio acreditada(s)` : "") +
          ".",
      );
      setConc(null);
      setFilas(null);
      setArchivo("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e: any) {
      setError("Error al guardar: " + (e?.message ?? e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Padron"
        title="Importar corte"
        subtitle="Sube el reporte de cortes de la semana. Se compara contra el corte anterior, se detectan los pagos y tu decides que se aplica."
        actions={
          cortes.length > 0 ? (
            <span className="chip-line">
              Ultimo corte: {fmtDate(cortes[0].fechaCorte)}
            </span>
          ) : undefined
        }
      />

      {listo && (
        <div className="mb-6 rounded-xl border border-exito/30 bg-exito-soft p-4 text-sm text-exito-ink">
          {listo}{" "}
          <Link href="/morosidad" className="link">
            Ver padron
          </Link>
        </div>
      )}

      {/* ---- Selector de archivo ---- */}
      <div className="card mb-6 p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-pizarra-line bg-pizarra-fill/50 px-6 py-10 text-center transition hover:border-aqua-300 hover:bg-aqua-50/40">
          <IconGota className="h-8 w-8 text-aqua-500" />
          <div>
            <div className="font-medium text-marino-900">
              {leyendo ? "Leyendo el archivo…" : "Elegir el Excel del reporte de cortes"}
            </div>
            <div className="mt-1 text-xs text-pizarra-mute">
              Archivo .xlsx tal como lo emite el sistema de la Junta
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) elegirArchivo(f);
            }}
          />
        </label>
        {archivo && (
          <div className="mt-3 text-center text-xs text-pizarra-mute">{archivo}</div>
        )}
      </div>

      {error && (
        <div className="card mb-6 border-alerta/30 bg-alerta-soft p-4 text-sm text-alerta-ink">
          {error}
        </div>
      )}

      {conc && (
        <>
          {yaImportado && (
            <div className="mb-6 rounded-xl border border-aviso/30 bg-aviso-soft p-4 text-sm text-aviso-ink">
              Ya hay un corte guardado con fecha {fmtDate(conc.fechaCorte)}. Si
              continuas se registrara otro y los saldos se sobrescribiran con
              este archivo.
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Cuentas en el archivo"
              value={String(conc.totalCuentas)}
              hint={`Corte del ${fmtDate(conc.fechaCorte)}`}
              tono="marino"
            />
            <Stat
              label="Adeudo total"
              value={currency(conc.totalAdeudo)}
              tono="aqua"
            />
            <Stat
              label="Pagos detectados"
              value={String(conc.pagos.length)}
              hint={`${incluidos.length} por aplicar`}
              tono="exito"
            />
            <Stat
              label="Altas nuevas"
              value={String(conc.altas.length)}
              hint={conc.ausentes.length ? `${conc.ausentes.length} ausente(s)` : "Sin bajas"}
              tono={conc.altas.length ? "aqua" : "marino"}
            />
          </div>

          {/* ---- Como se estimaron los montos ---- */}
          <div className="card mb-6 p-5">
            <h2 className="text-sm font-semibold text-marino-900">
              Como se calcularon los pagos
            </h2>
            {conc.huboFacturacion ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-pizarra-soft">
                  Entre este corte y el anterior se aplico el recibo del periodo, asi
                  que el saldo de casi todos subio. Para no perder a quien pago menos
                  de lo que se le facturo, el monto se calcula como{" "}
                  <span className="font-medium text-marino-800">
                    saldo anterior − saldo nuevo + cargo del periodo
                  </span>
                  . El cargo se estima con la mediana de quienes no pagaron, por
                  tarifa:
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(conc.cargoPorTarifa).map(([t, v]) => (
                    <span key={t} className="chip-aqua">
                      {t} · {currency(v)}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-aviso-ink">
                  Por eso los montos son estimados. Revisalos antes de aplicar.
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-pizarra-soft">
                Entre este corte y el anterior no se facturo, asi que el monto es la
                resta directa de saldos y es exacto.
              </p>
            )}
          </div>

          {/* ---- Pestanas ---- */}
          <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-pizarra-line bg-white p-1">
            {(
              [
                ["pagos", "Pagos", conc.pagos.length],
                ["altas", "Altas", conc.altas.length],
                ["cambios", "Cambios de datos", conc.cambios.length],
                ["ausentes", "Ausentes", conc.ausentes.length],
              ] as const
            ).map(([k, l, n]) => (
              <button
                key={k}
                onClick={() => setPestana(k)}
                className={
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
                  (pestana === k
                    ? "bg-marino-800 text-white"
                    : "text-pizarra-soft hover:bg-pizarra-fill hover:text-marino-800")
                }
              >
                {l}
                <span
                  className={
                    "ml-1.5 tabular-nums " +
                    (pestana === k ? "text-aqua-300" : "text-pizarra-mute")
                  }
                >
                  {n}
                </span>
              </button>
            ))}
          </div>

          <div className="card p-5">
            {pestana === "pagos" && (
              <TablaPagos
                pagos={conc.pagos}
                decisiones={decisiones}
                setDec={setDec}
                siguienteLetra={siguienteLetra}
              />
            )}

            {pestana === "altas" && (
              <TablaSimple
                vacio="No hay cuentas nuevas en este archivo."
                encabezados={["Cuenta", "Nombre", "Domicilio", "Tarifa", "Adeudo"]}
                filas={conc.altas.map((a) => [
                  a.numeroCuenta,
                  a.nombre,
                  a.direccion,
                  a.tarifa,
                  currency(a.adeudo),
                ])}
              />
            )}

            {pestana === "cambios" && (
              <TablaSimple
                vacio="Ningun dato del padron cambio."
                encabezados={["Cuenta", "Nombre", "Campo", "Antes", "Ahora"]}
                filas={conc.cambios.flatMap((c) =>
                  c.campos.map((f) => [
                    c.numeroCuenta,
                    c.nombre,
                    f.campo,
                    f.antes || "—",
                    f.ahora,
                  ]),
                )}
              />
            )}

            {pestana === "ausentes" && (
              <>
                <p className="mb-4 text-xs text-pizarra-mute">
                  Cuentas que estan en la base pero no vienen en este archivo. No se
                  borran: se conservan con su ultimo saldo conocido.
                </p>
                <TablaSimple
                  vacio="Todas las cuentas de la base vienen en el archivo."
                  encabezados={["Cuenta", "Nombre", "Ultimo saldo"]}
                  filas={conc.ausentes.map((a) => [
                    a.numeroCuenta,
                    a.nombre,
                    currency(a.saldoVencido),
                  ])}
                />
              </>
            )}
          </div>

          {/* ---- Confirmar ---- */}
          <div className="card-marino mt-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                Se aplicaran {incluidos.length} pago(s) por{" "}
                {currency(totalIncluido)}
              </div>
              <div className="mt-0.5 text-xs text-marino-200/80">
                {conc.totalCuentas} cuentas del padron se actualizan al corte del{" "}
                {fmtDate(conc.fechaCorte)}
                {conc.altas.length ? `, incluidas ${conc.altas.length} altas` : ""}.
              </div>
            </div>
            <button
              className="btn-aqua shrink-0"
              onClick={aplicar}
              disabled={guardando}
            >
              {guardando ? "Aplicando…" : "Aplicar corte"}
            </button>
          </div>
        </>
      )}

      {/* ---- Historial ---- */}
      {!conc && cortes.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-marino-900">
            Cortes importados
          </h2>
          <p className="mb-4 mt-1 text-xs text-pizarra-mute">
            De cada corte se guarda el archivo completo, asi que el mas reciente
            se puede deshacer: el padron regresa al corte anterior, se borran sus
            pagos y las letras de convenio vuelven a pendiente.
          </p>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pizarra-line">
                  <th className="th">Fecha</th>
                  <th className="th">Archivo</th>
                  <th className="th text-right">Cuentas</th>
                  <th className="th text-right">Adeudo</th>
                  <th className="th text-right">Altas</th>
                  <th className="th text-right">Pagos</th>
                  <th className="th text-right">Monto</th>
                  <th className="th text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map((c, i) => (
                  <tr key={c.id} className="tr-row">
                    <td className="whitespace-nowrap py-3 pr-4 font-medium text-marino-900">
                      {fmtDate(c.fechaCorte)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-pizarra-mute">
                      {c.archivo ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                      {c.totalCuentas}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                      {currency(c.totalAdeudo)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                      {c.altas}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                      {c.pagosDetectados}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums font-medium text-marino-900">
                      {currency(c.montoDetectado)}
                    </td>
                    <td className="py-3 text-right">
                      {i === 0 && cortes.length > 1 ? (
                        <button
                          className="btn-danger text-xs"
                          disabled={deshaciendo === c.id}
                          onClick={async () => {
                            if (
                              !confirm(
                                `Deshacer la importacion del ${fmtDate(c.fechaCorte)}?\n\n` +
                                  "El padron regresa al corte anterior, se borran sus pagos " +
                                  "detectados y las letras de convenio que se hayan acreditado " +
                                  "vuelven a pendiente.",
                              )
                            )
                              return;
                            setDeshaciendo(c.id);
                            setError(null);
                            try {
                              const r = await deshacerCorte(c.id);
                              setListo(
                                `Importacion del ${fmtDate(c.fechaCorte)} deshecha: ` +
                                  `${r.cuentas_restauradas} cuenta(s) restauradas, ` +
                                  `${r.movimientos_borrados} pago(s) borrados` +
                                  (r.letras_revertidas
                                    ? `, ${r.letras_revertidas} letra(s) de convenio de vuelta a pendiente`
                                    : "") +
                                  (r.cuentas_eliminadas
                                    ? `, ${r.cuentas_eliminadas} alta(s) eliminada(s)`
                                    : "") +
                                  ".",
                              );
                            } catch (e: any) {
                              setError(
                                "No se pudo deshacer: " + (e?.message ?? e),
                              );
                            } finally {
                              setDeshaciendo(null);
                            }
                          }}
                        >
                          {deshaciendo === c.id ? "Deshaciendo…" : "Deshacer"}
                        </button>
                      ) : (
                        <span className="text-xs text-pizarra-mute">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/** Meses completos entre el ultimo pago y la fecha de corte. */
function mesesDesde(ultimoPago: string | undefined, corte: string): number {
  if (!ultimoPago) return 0;
  const a = new Date(ultimoPago + "T12:00:00");
  const b = new Date(corte + "T12:00:00");
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(m, 0);
}

function TablaPagos({
  pagos,
  decisiones,
  setDec,
  siguienteLetra,
}: {
  pagos: PagoDetectado[];
  decisiones: Record<string, Decision>;
  setDec: (id: string, patch: Partial<Decision>) => void;
  siguienteLetra: Map<
    string,
    {
      convenio: Convenio;
      pagoId: string;
      numero: number;
      monto: number;
      fechaProgramada: string;
    }
  >;
}) {
  if (!pagos.length)
    return (
      <p className="py-10 text-center text-sm text-pizarra-mute">
        No se detectaron pagos entre este corte y el anterior.
      </p>
    );

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-pizarra-line">
            <th className="th">Aplicar</th>
            <th className="th">Cuentahabiente</th>
            <th className="th">Fecha</th>
            <th className="th text-right">Saldo antes → después</th>
            <th className="th text-right">Monto</th>
            <th className="th">Convenio</th>
          </tr>
        </thead>
        <tbody>
          {pagos.map((p) => {
            const d = decisiones[p.cuentahabienteId];
            const letra = siguienteLetra.get(p.cuentahabienteId);
            return (
              <tr key={p.cuentahabienteId} className="tr-row">
                <td className="py-3 pr-4">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-aqua-500"
                    checked={d?.incluir ?? false}
                    onChange={(e) =>
                      setDec(p.cuentahabienteId, { incluir: e.target.checked })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-marino-900">{p.nombre}</div>
                  <div className="font-mono text-[11px] text-pizarra-mute">
                    {p.numeroCuenta}
                  </div>
                  {p.origen === "fecha" && (
                    <span className="chip-aviso mt-1">pago sin baja de saldo</span>
                  )}
                  {p.origen === "saldo" && (
                    <span className="chip-aviso mt-1">ajuste, no pago</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-pizarra-soft">
                  {p.fechaPago ? fmtDate(p.fechaPago) : "—"}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-right text-xs text-pizarra-soft">
                  {currency(p.saldoAnterior)} → {currency(p.saldoNuevo)}
                  {p.cargoEstimado > 0 && (
                    <div className="text-[10px] text-pizarra-mute">
                      + cargo {currency(p.cargoEstimado)}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="input w-32 text-right"
                    value={d?.monto ?? 0}
                    onChange={(e) =>
                      setDec(p.cuentahabienteId, { monto: Number(e.target.value) })
                    }
                  />
                  <div className="mt-1 text-[10px] text-pizarra-mute">
                    {p.exacto ? "exacto" : "estimado"}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  {letra ? (
                    (() => {
                      const pagado = d?.monto ?? 0;
                      const dif = Math.round((pagado - letra.monto) * 100) / 100;
                      const atraso =
                        p.fechaPago && p.fechaPago > letra.fechaProgramada
                          ? Math.round(
                              (new Date(p.fechaPago + "T12:00:00").getTime() -
                                new Date(
                                  letra.fechaProgramada + "T12:00:00",
                                ).getTime()) /
                                86400000,
                            )
                          : 0;
                      return (
                        <label className="inline-flex cursor-pointer items-start gap-2 text-xs text-marino-800">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-aqua-500"
                            checked={d?.acreditar ?? false}
                            onChange={(e) =>
                              setDec(p.cuentahabienteId, {
                                acreditar: e.target.checked,
                              })
                            }
                          />
                          <span>
                            Cubre letra {letra.numero}/{letra.convenio.numeroPagos}
                            <span className="block text-[10px] text-pizarra-mute">
                              {letra.convenio.folio} · acordado{" "}
                              {currency(letra.monto)} · vencia{" "}
                              {fmtDate(letra.fechaProgramada)}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              {Math.abs(dif) < 0.01 ? (
                                <span className="chip-exito">monto exacto</span>
                              ) : dif < 0 ? (
                                <span className="chip-alerta">
                                  faltan {currency(-dif)}
                                </span>
                              ) : (
                                <span className="chip-aqua">
                                  paga {currency(dif)} de mas
                                </span>
                              )}
                              {atraso > 0 && (
                                <span className="chip-aviso">
                                  {atraso} d de atraso
                                </span>
                              )}
                            </span>
                          </span>
                        </label>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-pizarra-mute">sin convenio</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablaSimple({
  encabezados,
  filas,
  vacio,
}: {
  encabezados: string[];
  filas: (string | number)[][];
  vacio: string;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const LIMITE = 50;
  if (!filas.length)
    return <p className="py-10 text-center text-sm text-pizarra-mute">{vacio}</p>;
  const visibles = verTodo ? filas : filas.slice(0, LIMITE);
  return (
    <>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pizarra-line">
              {encabezados.map((h) => (
                <th key={h} className="th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={i} className="tr-row">
                {f.map((c, j) => (
                  <td key={j} className="py-2.5 pr-4 text-pizarra-soft">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!verTodo && filas.length > LIMITE && (
        <div className="mt-4 text-center">
          <button className="btn-secondary" onClick={() => setVerTodo(true)}>
            Mostrar las {filas.length - LIMITE} restantes
          </button>
        </div>
      )}
    </>
  );
}
