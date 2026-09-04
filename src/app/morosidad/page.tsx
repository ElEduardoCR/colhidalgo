"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Stat } from "@/components/Stat";
import { currency, fmtDate } from "@/lib/format";
import { TARIFAS, type Cuentahabiente } from "@/lib/types";
import { IconBuscar } from "@/components/icons";

const empty: Omit<Cuentahabiente, "id"> = {
  nombre: "",
  numeroCuenta: "",
  direccion: "",
  telefono: "",
  email: "",
  saldoVencido: 0,
  mesesAdeudo: 0,
  ultimoPago: "",
  tarifa: "",
  noMedidor: "",
  consumo: undefined,
  observaciones: "",
};

const POR_PAGINA = 40;

type Orden = "adeudo" | "nombre" | "antiguedad" | "ruta";

export default function MorosidadPage() {
  const {
    umbralMorosidad,
    setUmbralMorosidad,
    cuentahabientes,
    addCuentahabiente,
    updateCuentahabiente,
    removeCuentahabiente,
    convenios,
  } = useStore();

  const [filtro, setFiltro] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [soloSinConvenio, setSoloSinConvenio] = useState(false);
  const [orden, setOrden] = useState<Orden>("adeudo");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [umbralTexto, setUmbralTexto] = useState(String(umbralMorosidad));
  const [soloMorosos, setSoloMorosos] = useState(true);

  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cuentahabiente, "id">>(empty);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const conConvenioActivo = useMemo(
    () =>
      new Set(
        convenios
          .filter((c) => c.estado === "activo")
          .map((c) => c.cuentahabienteId),
      ),
    [convenios],
  );

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const lista = cuentahabientes.filter((c) => {
      if (soloMorosos && c.saldoVencido < umbralMorosidad) return false;
      if (tarifa && (c.tarifa ?? "") !== tarifa) return false;
      if (soloSinConvenio && conConvenioActivo.has(c.id)) return false;
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.numeroCuenta.toLowerCase().includes(q) ||
        (c.direccion ?? "").toLowerCase().includes(q) ||
        (c.noMedidor ?? "").toLowerCase().includes(q) ||
        (c.telefono ?? "").includes(q)
      );
    });

    const ordenar: Record<Orden, (a: Cuentahabiente, b: Cuentahabiente) => number> =
      {
        adeudo: (a, b) => b.saldoVencido - a.saldoVencido,
        nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
        antiguedad: (a, b) => (a.ultimoPago ?? "").localeCompare(b.ultimoPago ?? ""),
        ruta: (a, b) =>
          (a.ruta ?? 0) - (b.ruta ?? 0) || (a.secuencia ?? 0) - (b.secuencia ?? 0),
      };
    return [...lista].sort(ordenar[orden]);
  }, [cuentahabientes, filtro, tarifa, soloSinConvenio, conConvenioActivo, orden, soloMorosos, umbralMorosidad]);

  const totalFiltrado = filtrados.reduce((s, c) => s + c.saldoVencido, 0);
  const sinConvenio = filtrados.filter((c) => !conConvenioActivo.has(c.id)).length;
  const fechaCorte = cuentahabientes.find((c) => c.fechaCorte)?.fechaCorte;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) await updateCuentahabiente(editando, form);
      else await addCuentahabiente(form);
      setForm(empty);
      setEditando(null);
      setMostrarForm(false);
    } catch (err: any) {
      alert("Error al guardar: " + (err?.message ?? err));
    } finally {
      setGuardando(false);
    }
  };

  const editar = (c: Cuentahabiente) => {
    setEditando(c.id);
    const { id, ...resto } = c;
    setForm({ ...empty, ...resto });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = (patch: Partial<Cuentahabiente>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader
        eyebrow="Padron"
        title="Morosidad"
        subtitle={
          `Padron de ${cuentahabientes.length} cuentas` +
          (fechaCorte ? ` al corte del ${fmtDate(fechaCorte)}` : "") +
          `. Se considera morosa una cuenta con adeudo desde ${currency(umbralMorosidad)}.`
        }
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditando(null);
              setForm(empty);
              setMostrarForm((v) => !v);
            }}
          >
            {mostrarForm ? "Cerrar" : "Agregar cuenta"}
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Adeudo filtrado"
          value={currency(totalFiltrado)}
          hint={`${filtrados.length} de ${cuentahabientes.length} cuentas`}
          tono="marino"
        />
        <Stat
          label="Sin convenio"
          value={String(sinConvenio)}
          hint="Cuentas por gestionar"
          tono={sinConvenio ? "alerta" : "exito"}
        />
        <Stat
          label="Adeudo promedio"
          value={currency(filtrados.length ? totalFiltrado / filtrados.length : 0)}
          hint="Por cuenta filtrada"
          tono="aqua"
        />
      </div>

      {mostrarForm && (
        <form onSubmit={submit} className="card mb-6 grid gap-4 p-5 md:grid-cols-3">
          <h2 className="text-sm font-semibold text-marino-900 md:col-span-3">
            {editando ? "Editar cuenta" : "Nueva cuenta"}
          </h2>

          <div className="md:col-span-2">
            <div className="label mb-1">Nombre completo</div>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => set({ nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Numero de cuenta</div>
            <input
              className="input font-mono"
              value={form.numeroCuenta}
              onChange={(e) => set({ numeroCuenta: e.target.value })}
              required
            />
          </div>

          <div className="md:col-span-2">
            <div className="label mb-1">Domicilio</div>
            <input
              className="input"
              value={form.direccion}
              onChange={(e) => set({ direccion: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">No. de medidor</div>
            <input
              className="input font-mono"
              value={form.noMedidor ?? ""}
              onChange={(e) => set({ noMedidor: e.target.value })}
              placeholder="Sin medidor"
            />
          </div>

          <div>
            <div className="label mb-1">Adeudo (MXN)</div>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={form.saldoVencido}
              onChange={(e) => set({ saldoVencido: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Ultimo pago</div>
            <input
              className="input"
              type="date"
              value={form.ultimoPago ?? ""}
              onChange={(e) => set({ ultimoPago: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Meses de adeudo</div>
            <input
              className="input"
              type="number"
              min={0}
              value={form.mesesAdeudo}
              onChange={(e) => set({ mesesAdeudo: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <div className="label mb-1">Tarifa</div>
            <select
              className="input"
              value={form.tarifa ?? ""}
              onChange={(e) => set({ tarifa: e.target.value })}
            >
              <option value="">Sin tarifa</option>
              {Object.entries(TARIFAS).map(([clave, desc]) => (
                <option key={clave} value={clave}>
                  {clave} — {desc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Consumo (m³)</div>
            <input
              className="input"
              type="number"
              min={0}
              value={form.consumo ?? ""}
              onChange={(e) =>
                set({
                  consumo: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <div className="label mb-1">Ruta / Secuencia</div>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Ruta"
                value={form.ruta ?? ""}
                onChange={(e) =>
                  set({
                    ruta: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
              <input
                className="input"
                type="number"
                min={0}
                placeholder="Sec."
                value={form.secuencia ?? ""}
                onChange={(e) =>
                  set({
                    secuencia:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <div className="label mb-1">Telefono (WhatsApp)</div>
            <input
              className="input"
              inputMode="tel"
              placeholder="5216391234567"
              value={form.telefono}
              onChange={(e) => set({ telefono: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Correo electronico</div>
            <input
              className="input"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Observaciones</div>
            <input
              className="input"
              value={form.observaciones ?? ""}
              onChange={(e) => set({ observaciones: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 md:col-span-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setMostrarForm(false);
                setEditando(null);
                setForm(empty);
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      )}

      <div className="card p-5">
        {/* ---- Filtros ---- */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <IconBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra-mute" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, cuenta, domicilio o medidor"
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setVisibles(POR_PAGINA);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input w-auto"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
            >
              <option value="">Todas las tarifas</option>
              {Object.keys(TARIFAS).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="input w-auto"
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
            >
              <option value="adeudo">Mayor adeudo</option>
              <option value="antiguedad">Pago mas antiguo</option>
              <option value="nombre">Nombre (A-Z)</option>
              <option value="ruta">Ruta y secuencia</option>
            </select>
            <button
              type="button"
              onClick={() => setSoloMorosos((v) => !v)}
              className={
                "rounded-full px-3.5 py-2 text-xs font-semibold transition " +
                (soloMorosos
                  ? "bg-marino-800 text-white"
                  : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300")
              }
              title="Muestra solo las cuentas que superan el umbral de morosidad"
            >
              Solo morosos
            </button>
            <label className="flex items-center gap-1.5 text-xs text-pizarra-mute">
              desde
              <input
                type="number"
                min={0}
                step="50"
                className="input w-24"
                value={umbralTexto}
                onChange={(e) => setUmbralTexto(e.target.value)}
                onBlur={() => {
                  const n = Number(umbralTexto);
                  if (Number.isFinite(n) && n >= 0 && n !== umbralMorosidad) {
                    setUmbralMorosidad(n).catch((err) =>
                      alert("No se pudo guardar el umbral: " + (err?.message ?? err)),
                    );
                  } else {
                    setUmbralTexto(String(umbralMorosidad));
                  }
                }}
                title="Adeudo minimo para considerar morosa una cuenta"
              />
            </label>
            <button
              type="button"
              onClick={() => setSoloSinConvenio((v) => !v)}
              className={
                "rounded-full px-3.5 py-2 text-xs font-semibold transition " +
                (soloSinConvenio
                  ? "bg-marino-800 text-white"
                  : "border border-pizarra-line bg-white text-pizarra-soft hover:border-aqua-300")
              }
            >
              Sin convenio
            </button>
          </div>
        </div>

        {/* ---- Tabla ---- */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pizarra-line">
                <th className="th">Cuenta</th>
                <th className="th">Cuentahabiente</th>
                <th className="th text-right">Adeudo</th>
                <th className="th">Tarifa</th>
                <th className="th text-right">Consumo</th>
                <th className="th">Ultimo pago</th>
                <th className="th">Medidor</th>
                <th className="th">Convenio</th>
                <th className="th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, visibles).map((c) => (
                <tr key={c.id} className="tr-row">
                  <td className="py-3 pr-4 font-mono text-xs text-pizarra-soft">
                    {c.numeroCuenta}
                    {c.ruta != null && (
                      <div className="text-[10px] text-pizarra-mute">
                        R{c.ruta} · S{c.secuencia ?? "—"}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-marino-900">{c.nombre}</div>
                    <div className="text-xs text-pizarra-mute">{c.direccion}</div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-marino-900">
                    {currency(c.saldoVencido)}
                    {c.mesesAdeudo > 0 && (
                      <div className="text-[10px] font-normal text-pizarra-mute">
                        {c.mesesAdeudo} mes(es)
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {c.tarifa ? (
                      <span className="chip-aqua" title={TARIFAS[c.tarifa] ?? ""}>
                        {c.tarifa}
                      </span>
                    ) : (
                      <span className="text-pizarra-mute">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-pizarra-soft">
                    {c.consumo != null ? `${c.consumo} m³` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-pizarra-soft">
                    {c.ultimoPago ? fmtDate(c.ultimoPago) : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-pizarra-mute">
                    {c.noMedidor || "sin medidor"}
                  </td>
                  <td className="py-3 pr-4">
                    {conConvenioActivo.has(c.id) ? (
                      <span className="chip-exito">activo</span>
                    ) : (
                      <span className="chip-line">sin convenio</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-0 text-right">
                    <Link
                      href={`/convenios/nuevo?cuentahabiente=${c.id}`}
                      className="accion link mr-1"
                    >
                      Convenio
                    </Link>
                    <button
                      onClick={() => editar(c)}
                      className="accion mr-1 text-pizarra-soft hover:bg-pizarra-fill hover:text-marino-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Eliminar a " + c.nombre + "?")) {
                          try {
                            await removeCuentahabiente(c.id);
                          } catch (err: any) {
                            alert("Error al eliminar: " + (err?.message ?? err));
                          }
                        }
                      }}
                      className="accion text-pizarra-mute hover:bg-alerta-soft hover:text-alerta"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-pizarra-mute">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {visibles < filtrados.length && (
          <div className="mt-5 text-center">
            <button
              className="btn-secondary"
              onClick={() => setVisibles((v) => v + POR_PAGINA)}
            >
              Mostrar mas ({filtrados.length - visibles} restantes)
            </button>
          </div>
        )}
      </div>
    </>
  );
}
