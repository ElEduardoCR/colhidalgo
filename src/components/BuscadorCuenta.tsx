"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cuentahabiente } from "@/lib/types";
import { currency, fmtDate } from "@/lib/format";
import { IconBuscar, IconCerrar } from "./icons";

/** Quita acentos y pasa a minusculas para buscar sin preocuparse por tildes. */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const MAX_RESULTADOS = 40;

export function BuscadorCuenta({
  cuentas,
  valorId,
  onSelect,
}: {
  cuentas: Cuentahabiente[];
  valorId: string;
  onSelect: (id: string) => void;
}) {
  const seleccionada = cuentas.find((c) => c.id === valorId);

  const [abierto, setAbierto] = useState(!seleccionada);
  const [q, setQ] = useState("");
  const [resaltado, setResaltado] = useState(0);

  const contenedor = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  // Una sola pasada: se filtra todo y luego se recorta para pintar.
  const coincidencias = useMemo(() => {
    const term = normalizar(q.trim());
    if (!term) return cuentas;
    const palabras = term.split(/\s+/);
    return cuentas.filter((c) => {
      const heno = normalizar(
        `${c.nombre} ${c.numeroCuenta} ${c.direccion ?? ""} ${c.noMedidor ?? ""}`,
      );
      return palabras.every((p) => heno.includes(p));
    });
  }, [cuentas, q]);

  const resultados = useMemo(
    () => coincidencias.slice(0, MAX_RESULTADOS),
    [coincidencias],
  );
  const totalCoincidencias = coincidencias.length;

  useEffect(() => setResaltado(0), [q]);

  // Cerrar al tocar fuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) {
        if (seleccionada) setAbierto(false);
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
    };
  }, [abierto, seleccionada]);

  // Mantener la fila resaltada a la vista al navegar con el teclado.
  useEffect(() => {
    listaRef.current?.children[resaltado]?.scrollIntoView({ block: "nearest" });
  }, [resaltado]);

  const elegir = (c: Cuentahabiente) => {
    onSelect(c.id);
    setQ("");
    setAbierto(false);
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = resultados[resaltado];
      if (c) elegir(c);
    } else if (e.key === "Escape") {
      if (seleccionada) setAbierto(false);
    }
  };

  // ---- Cuenta ya elegida: ficha compacta con boton para cambiarla ----
  if (seleccionada && !abierto) {
    return (
      <div className="rounded-xl border border-aqua-200 bg-aqua-50/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-marino-900">
              {seleccionada.nombre}
            </div>
            <div className="mt-0.5 font-mono text-xs text-pizarra-mute">
              Cuenta {seleccionada.numeroCuenta}
            </div>
            <div className="truncate text-xs text-pizarra-soft">
              {seleccionada.direccion || "Sin domicilio registrado"}
            </div>
            <div className="mt-1 text-xs text-pizarra-mute">
              Ultimo pago:{" "}
              {seleccionada.ultimoPago
                ? fmtDate(seleccionada.ultimoPago)
                : "sin registro"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-semibold text-marino-900">
              {currency(seleccionada.saldoVencido)}
            </div>
            <button
              type="button"
              className="btn-secondary mt-2 text-xs"
              onClick={() => {
                setAbierto(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Modo busqueda ----
  return (
    <div ref={contenedor} className="relative">
      <div className="relative">
        <IconBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra-mute" />
        <input
          ref={inputRef}
          className="input pl-9 pr-9"
          placeholder="Buscar por nombre, cuenta, domicilio o medidor"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclas}
          autoComplete="off"
          role="combobox"
          aria-expanded={abierto}
          aria-controls="lista-cuentas"
        />
        {(q || seleccionada) && (
          <button
            type="button"
            aria-label="Limpiar busqueda"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-pizarra-mute transition hover:bg-pizarra-fill hover:text-marino-800"
            onClick={() => {
              if (q) {
                setQ("");
                inputRef.current?.focus();
              } else {
                setAbierto(false);
              }
            }}
          >
            <IconCerrar className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-1.5 px-1 text-xs text-pizarra-mute">
        {totalCoincidencias === 0
          ? "Ninguna cuenta coincide."
          : `${totalCoincidencias} cuenta(s)` +
            (totalCoincidencias > MAX_RESULTADOS
              ? ` — se muestran las primeras ${MAX_RESULTADOS}, afina la busqueda`
              : "")}
      </div>

      {abierto && resultados.length > 0 && (
        <ul
          id="lista-cuentas"
          ref={listaRef}
          role="listbox"
          className="mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-pizarra-line bg-white shadow-card"
        >
          {resultados.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === resaltado}
                onMouseEnter={() => setResaltado(i)}
                onClick={() => elegir(c)}
                className={
                  "flex w-full items-center gap-3 border-b border-pizarra-line px-4 py-3 text-left transition last:border-0 " +
                  (i === resaltado ? "bg-aqua-50" : "hover:bg-pizarra-fill")
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-marino-900">
                    {c.nombre}
                  </div>
                  <div className="truncate text-xs text-pizarra-mute">
                    <span className="font-mono">{c.numeroCuenta}</span>
                    {c.direccion ? ` · ${c.direccion}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold text-marino-900">
                    {currency(c.saldoVencido)}
                  </div>
                  <div className="text-[11px] text-pizarra-mute">
                    {c.ultimoPago ? fmtDate(c.ultimoPago) : "sin pagos"}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
