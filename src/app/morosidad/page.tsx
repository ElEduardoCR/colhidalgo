"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { currency, fmtDate } from "@/lib/format";
import type { Cuentahabiente } from "@/lib/types";

const empty: Omit<Cuentahabiente, "id"> = {
  nombre: "",
  numeroCuenta: "",
  direccion: "",
  telefono: "",
  email: "",
  saldoVencido: 0,
  mesesAdeudo: 0,
  ultimoPago: "",
};

export default function MorosidadPage() {
  const {
    cuentahabientes,
    addCuentahabiente,
    updateCuentahabiente,
    removeCuentahabiente,
    convenios,
  } = useStore();
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cuentahabiente, "id">>(empty);
  const [mostrarForm, setMostrarForm] = useState(false);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return cuentahabientes;
    return cuentahabientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.numeroCuenta.toLowerCase().includes(q) ||
        c.telefono.includes(q),
    );
  }, [cuentahabientes, filtro]);

  const tieneConvenioActivo = (id: string) =>
    convenios.some((c) => c.cuentahabienteId === id && c.estado === "activo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      updateCuentahabiente(editando, form);
    } else {
      addCuentahabiente(form);
    }
    setForm(empty);
    setEditando(null);
    setMostrarForm(false);
  };

  const editar = (c: Cuentahabiente) => {
    setEditando(c.id);
    setForm({
      nombre: c.nombre,
      numeroCuenta: c.numeroCuenta,
      direccion: c.direccion,
      telefono: c.telefono,
      email: c.email ?? "",
      saldoVencido: c.saldoVencido,
      mesesAdeudo: c.mesesAdeudo,
      ultimoPago: c.ultimoPago ?? "",
    });
    setMostrarForm(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Cartera"
        title="Morosidad"
        subtitle="Cuentahabientes con saldo vencido. Da de alta o actualiza la informacion."
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

      {mostrarForm && (
        <form onSubmit={submit} className="card p-5 mb-6 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="label mb-1">Nombre completo</div>
            <input
              className="input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <div className="label mb-1">Numero de cuenta</div>
            <input
              className="input"
              value={form.numeroCuenta}
              onChange={(e) =>
                setForm({ ...form, numeroCuenta: e.target.value })
              }
              required
            />
          </div>
          <div>
            <div className="label mb-1">Telefono (con clave pais)</div>
            <input
              className="input"
              placeholder="5215512345678"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <div className="label mb-1">Direccion</div>
            <input
              className="input"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Correo electronico</div>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Ultimo pago</div>
            <input
              className="input"
              type="date"
              value={form.ultimoPago}
              onChange={(e) => setForm({ ...form, ultimoPago: e.target.value })}
            />
          </div>
          <div>
            <div className="label mb-1">Saldo vencido (MXN)</div>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={form.saldoVencido}
              onChange={(e) =>
                setForm({ ...form, saldoVencido: Number(e.target.value) })
              }
              required
            />
          </div>
          <div>
            <div className="label mb-1">Meses de adeudo</div>
            <input
              className="input"
              type="number"
              min={0}
              value={form.mesesAdeudo}
              onChange={(e) =>
                setForm({ ...form, mesesAdeudo: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
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
            <button type="submit" className="btn-primary">
              {editando ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      )}

      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            className="input md:max-w-sm"
            placeholder="Buscar por nombre, cuenta o telefono"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <div className="text-xs text-ink-mute">
            {filtrados.length} cuenta(s)
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-mute border-b border-paper-line">
                <th className="py-2 pr-4 font-medium">Cuenta</th>
                <th className="py-2 pr-4 font-medium">Cuentahabiente</th>
                <th className="py-2 pr-4 font-medium">Adeudo</th>
                <th className="py-2 pr-4 font-medium">Meses</th>
                <th className="py-2 pr-4 font-medium">Ultimo pago</th>
                <th className="py-2 pr-4 font-medium">Convenio</th>
                <th className="py-2 pr-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="py-3 pr-4 font-mono text-xs">
                    {c.numeroCuenta}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-ink-mute">{c.direccion}</div>
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {currency(c.saldoVencido)}
                  </td>
                  <td className="py-3 pr-4">{c.mesesAdeudo}</td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {c.ultimoPago ? fmtDate(c.ultimoPago) : "-"}
                  </td>
                  <td className="py-3 pr-4">
                    {tieneConvenioActivo(c.id) ? (
                      <span className="chip-warn">activo</span>
                    ) : (
                      <span className="chip-line">sin convenio</span>
                    )}
                  </td>
                  <td className="py-3 pr-0 text-right whitespace-nowrap">
                    <Link
                      href={`/convenios/nuevo?cuentahabiente=${c.id}`}
                      className="text-ink underline underline-offset-4 mr-3 text-xs"
                    >
                      Crear convenio
                    </Link>
                    <button
                      onClick={() => editar(c)}
                      className="text-ink-soft hover:text-ink text-xs mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Eliminar a " + c.nombre + "?")) {
                          removeCuentahabiente(c.id);
                        }
                      }}
                      className="text-ink-mute hover:text-ink text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-mute">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
