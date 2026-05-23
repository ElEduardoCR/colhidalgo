"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Convenio,
  Cuentahabiente,
  EstadoPago,
  PagoConvenio,
} from "./types";
import { conveniosSeed, cuentahabientesSeed } from "./seed";
import { addPeriod, todayISO } from "./format";

const STORAGE_KEY = "colhidalgo_state_v1";

type State = {
  cuentahabientes: Cuentahabiente[];
  convenios: Convenio[];
};

type Ctx = State & {
  addCuentahabiente: (c: Omit<Cuentahabiente, "id">) => Cuentahabiente;
  updateCuentahabiente: (id: string, patch: Partial<Cuentahabiente>) => void;
  removeCuentahabiente: (id: string) => void;

  createConvenio: (
    input: Omit<Convenio, "id" | "folio" | "pagos" | "estado" | "fechaCreacion"> & {
      fechaCreacion?: string;
    },
  ) => Convenio;
  updateConvenio: (id: string, patch: Partial<Convenio>) => void;
  reestructurarConvenio: (
    id: string,
    input: {
      numeroPagos: number;
      montoPago: number;
      periodicidad: Convenio["periodicidad"];
      fechaPrimerPago: string;
      observaciones?: string;
    },
  ) => void;
  marcarPago: (
    convenioId: string,
    pagoId: string,
    estado: EstadoPago,
    fechaPago?: string,
    notas?: string,
  ) => void;
  archivarConvenio: (id: string) => void;
  cancelarConvenio: (id: string) => void;
  eliminarConvenio: (id: string) => void;
};

const StoreContext = createContext<Ctx | null>(null);

const generarPagos = (
  numeroPagos: number,
  montoPago: number,
  fechaPrimerPago: string,
  periodicidad: Convenio["periodicidad"],
): PagoConvenio[] =>
  Array.from({ length: numeroPagos }, (_, i) => ({
    id: `pago-${Date.now()}-${i}`,
    numero: i + 1,
    fechaProgramada: addPeriod(fechaPrimerPago, periodicidad, i),
    monto: montoPago,
    estado: "pendiente" as EstadoPago,
  }));

const nuevoFolio = (existentes: Convenio[]) => {
  const year = new Date().getFullYear();
  const correlativo = existentes.filter((c) => c.folio.includes(`${year}`))
    .length + 1;
  return `CONV-${year}-${String(correlativo).padStart(4, "0")}`;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({
    cuentahabientes: cuentahabientesSeed,
    convenios: conveniosSeed,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const addCuentahabiente: Ctx["addCuentahabiente"] = useCallback((c) => {
    const nuevo: Cuentahabiente = { ...c, id: `c-${Date.now()}` };
    setState((s) => ({ ...s, cuentahabientes: [nuevo, ...s.cuentahabientes] }));
    return nuevo;
  }, []);

  const updateCuentahabiente: Ctx["updateCuentahabiente"] = useCallback(
    (id, patch) => {
      setState((s) => ({
        ...s,
        cuentahabientes: s.cuentahabientes.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      }));
    },
    [],
  );

  const removeCuentahabiente: Ctx["removeCuentahabiente"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      cuentahabientes: s.cuentahabientes.filter((c) => c.id !== id),
    }));
  }, []);

  const createConvenio: Ctx["createConvenio"] = useCallback((input) => {
    const id = `conv-${Date.now()}`;
    let nuevo: Convenio | null = null;
    setState((s) => {
      const folio = nuevoFolio(s.convenios);
      nuevo = {
        ...input,
        id,
        folio,
        fechaCreacion: input.fechaCreacion ?? todayISO(),
        estado: "activo",
        pagos: generarPagos(
          input.numeroPagos,
          input.montoPago,
          input.fechaPrimerPago,
          input.periodicidad,
        ),
      };
      return { ...s, convenios: [nuevo, ...s.convenios] };
    });
    return nuevo as unknown as Convenio;
  }, []);

  const updateConvenio: Ctx["updateConvenio"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      convenios: s.convenios.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const reestructurarConvenio: Ctx["reestructurarConvenio"] = useCallback(
    (id, input) => {
      setState((s) => ({
        ...s,
        convenios: s.convenios.map((c) => {
          if (c.id !== id) return c;
          const pagosPagados = c.pagos.filter((p) => p.estado === "pagado");
          const nuevosPagos = generarPagos(
            input.numeroPagos,
            input.montoPago,
            input.fechaPrimerPago,
            input.periodicidad,
          ).map((p, i) => ({
            ...p,
            numero: pagosPagados.length + i + 1,
          }));
          return {
            ...c,
            numeroPagos: pagosPagados.length + input.numeroPagos,
            montoPago: input.montoPago,
            periodicidad: input.periodicidad,
            fechaPrimerPago: input.fechaPrimerPago,
            observaciones: input.observaciones ?? c.observaciones,
            pagos: [...pagosPagados, ...nuevosPagos],
          };
        }),
      }));
    },
    [],
  );

  const marcarPago: Ctx["marcarPago"] = useCallback(
    (convenioId, pagoId, estado, fechaPago, notas) => {
      setState((s) => ({
        ...s,
        convenios: s.convenios.map((c) => {
          if (c.id !== convenioId) return c;
          const pagos = c.pagos.map((p) =>
            p.id === pagoId
              ? {
                  ...p,
                  estado,
                  fechaPago: estado === "pagado" ? fechaPago ?? todayISO() : undefined,
                  notas: notas ?? p.notas,
                }
              : p,
          );
          const todos = pagos.every((p) => p.estado === "pagado");
          return {
            ...c,
            pagos,
            estado: todos ? "completado" : c.estado,
            archivadoEn: todos ? todayISO() : c.archivadoEn,
          };
        }),
      }));
    },
    [],
  );

  const archivarConvenio: Ctx["archivarConvenio"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      convenios: s.convenios.map((c) =>
        c.id === id
          ? { ...c, estado: "completado", archivadoEn: todayISO() }
          : c,
      ),
    }));
  }, []);

  const cancelarConvenio: Ctx["cancelarConvenio"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      convenios: s.convenios.map((c) =>
        c.id === id
          ? { ...c, estado: "cancelado", archivadoEn: todayISO() }
          : c,
      ),
    }));
  }, []);

  const eliminarConvenio: Ctx["eliminarConvenio"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      convenios: s.convenios.filter((c) => c.id !== id),
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      addCuentahabiente,
      updateCuentahabiente,
      removeCuentahabiente,
      createConvenio,
      updateConvenio,
      reestructurarConvenio,
      marcarPago,
      archivarConvenio,
      cancelarConvenio,
      eliminarConvenio,
    }),
    [
      state,
      addCuentahabiente,
      updateCuentahabiente,
      removeCuentahabiente,
      createConvenio,
      updateConvenio,
      reestructurarConvenio,
      marcarPago,
      archivarConvenio,
      cancelarConvenio,
      eliminarConvenio,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
