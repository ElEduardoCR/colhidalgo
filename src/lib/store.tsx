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
import { addPeriod, todayISO } from "./format";
import * as api from "./api";

type State = {
  cuentahabientes: Cuentahabiente[];
  convenios: Convenio[];
  loading: boolean;
  error: string | null;
};

type Ctx = State & {
  refresh: () => Promise<void>;
  addCuentahabiente: (c: Omit<Cuentahabiente, "id">) => Promise<Cuentahabiente>;
  updateCuentahabiente: (
    id: string,
    patch: Partial<Cuentahabiente>,
  ) => Promise<void>;
  removeCuentahabiente: (id: string) => Promise<void>;

  createConvenio: (
    input: Omit<
      Convenio,
      "id" | "folio" | "pagos" | "estado" | "fechaCreacion"
    > & { fechaCreacion?: string },
  ) => Promise<Convenio>;
  reestructurarConvenio: (
    id: string,
    input: {
      numeroPagos: number;
      montoPago: number;
      periodicidad: Convenio["periodicidad"];
      fechaPrimerPago: string;
      observaciones?: string;
    },
  ) => Promise<void>;
  marcarPago: (
    convenioId: string,
    pagoId: string,
    estado: EstadoPago,
    fechaPago?: string,
    notas?: string,
  ) => Promise<void>;
  archivarConvenio: (id: string) => Promise<void>;
  cancelarConvenio: (id: string) => Promise<void>;
  eliminarConvenio: (id: string) => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

const generarPagos = (
  numeroPagos: number,
  montoPago: number,
  fechaPrimerPago: string,
  periodicidad: Convenio["periodicidad"],
  inicioNumero = 0,
): PagoConvenio[] =>
  Array.from({ length: numeroPagos }, (_, i) => ({
    id: `pago-${Date.now()}-${inicioNumero + i}`,
    numero: inicioNumero + i + 1,
    fechaProgramada: addPeriod(fechaPrimerPago, periodicidad, i),
    monto: montoPago,
    estado: "pendiente" as EstadoPago,
  }));

const nuevoFolio = (existentes: Convenio[]) => {
  const year = new Date().getFullYear();
  const n = existentes.filter((c) => c.folio.includes(`${year}`)).length + 1;
  return `CONV-${year}-${String(n).padStart(4, "0")}`;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cuentahabientes, setCuentahabientes] = useState<Cuentahabiente[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, cv] = await Promise.all([
        api.getCuentahabientes(),
        api.getConvenios(),
      ]);
      setCuentahabientes(cs);
      setConvenios(cv);
    } catch (e: any) {
      setError(e?.message ?? "Error al conectar con la base de datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCuentahabiente: Ctx["addCuentahabiente"] = useCallback(async (c) => {
    const nuevo: Cuentahabiente = { ...c, id: `c-${Date.now()}` };
    await api.insertCuentahabiente(nuevo);
    setCuentahabientes((s) =>
      [nuevo, ...s].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    return nuevo;
  }, []);

  const updateCuentahabiente: Ctx["updateCuentahabiente"] = useCallback(
    async (id, patch) => {
      const actual = cuentahabientes.find((x) => x.id === id);
      if (!actual) return;
      const merged = { ...actual, ...patch };
      await api.updateCuentahabienteDB(merged);
      setCuentahabientes((s) =>
        s.map((x) => (x.id === id ? merged : x)),
      );
    },
    [cuentahabientes],
  );

  const removeCuentahabiente: Ctx["removeCuentahabiente"] = useCallback(
    async (id) => {
      await api.deleteCuentahabiente(id);
      setCuentahabientes((s) => s.filter((x) => x.id !== id));
      setConvenios((s) => s.filter((c) => c.cuentahabienteId !== id));
    },
    [],
  );

  const createConvenio: Ctx["createConvenio"] = useCallback(
    async (input) => {
      const nuevo: Convenio = {
        ...input,
        id: `conv-${Date.now()}`,
        folio: nuevoFolio(convenios),
        fechaCreacion: input.fechaCreacion ?? todayISO(),
        estado: "activo",
        pagos: generarPagos(
          input.numeroPagos,
          input.montoPago,
          input.fechaPrimerPago,
          input.periodicidad,
        ),
      };
      await api.insertConvenio(nuevo);
      setConvenios((s) => [nuevo, ...s]);
      return nuevo;
    },
    [convenios],
  );

  const reestructurarConvenio: Ctx["reestructurarConvenio"] = useCallback(
    async (id, input) => {
      const conv = convenios.find((c) => c.id === id);
      if (!conv) return;
      const pagados = conv.pagos.filter((p) => p.estado === "pagado");
      const nuevos = generarPagos(
        input.numeroPagos,
        input.montoPago,
        input.fechaPrimerPago,
        input.periodicidad,
        pagados.length,
      );
      const pagos = [...pagados, ...nuevos];
      const patch: Partial<Convenio> = {
        numeroPagos: pagados.length + input.numeroPagos,
        montoPago: input.montoPago,
        periodicidad: input.periodicidad,
        fechaPrimerPago: input.fechaPrimerPago,
        observaciones: input.observaciones ?? conv.observaciones,
      };
      await api.updateConvenioFields(id, patch);
      await api.replacePagos(id, pagos);
      setConvenios((s) =>
        s.map((c) => (c.id === id ? { ...c, ...patch, pagos } : c)),
      );
    },
    [convenios],
  );

  const marcarPago: Ctx["marcarPago"] = useCallback(
    async (convenioId, pagoId, estado, fechaPago, notas) => {
      const fecha = estado === "pagado" ? fechaPago ?? todayISO() : undefined;
      await api.updatePagoDB(pagoId, estado, fecha, notas);

      const conv = convenios.find((c) => c.id === convenioId);
      if (!conv) return;
      const pagos = conv.pagos.map((p) =>
        p.id === pagoId
          ? { ...p, estado, fechaPago: fecha, notas: notas ?? p.notas }
          : p,
      );
      const todos = pagos.every((p) => p.estado === "pagado");
      const patch: Partial<Convenio> = todos
        ? { estado: "completado", archivadoEn: todayISO() }
        : {};
      if (todos) {
        await api.updateConvenioFields(convenioId, patch);
      }
      setConvenios((s) =>
        s.map((c) =>
          c.id === convenioId ? { ...c, ...patch, pagos } : c,
        ),
      );
    },
    [convenios],
  );

  const setEstado = useCallback(
    async (id: string, estado: Convenio["estado"]) => {
      const patch: Partial<Convenio> = { estado, archivadoEn: todayISO() };
      await api.updateConvenioFields(id, patch);
      setConvenios((s) =>
        s.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const archivarConvenio: Ctx["archivarConvenio"] = useCallback(
    (id) => setEstado(id, "completado"),
    [setEstado],
  );
  const cancelarConvenio: Ctx["cancelarConvenio"] = useCallback(
    (id) => setEstado(id, "cancelado"),
    [setEstado],
  );

  const eliminarConvenio: Ctx["eliminarConvenio"] = useCallback(async (id) => {
    await api.deleteConvenio(id);
    setConvenios((s) => s.filter((c) => c.id !== id));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      cuentahabientes,
      convenios,
      loading,
      error,
      refresh,
      addCuentahabiente,
      updateCuentahabiente,
      removeCuentahabiente,
      createConvenio,
      reestructurarConvenio,
      marcarPago,
      archivarConvenio,
      cancelarConvenio,
      eliminarConvenio,
    }),
    [
      cuentahabientes,
      convenios,
      loading,
      error,
      refresh,
      addCuentahabiente,
      updateCuentahabiente,
      removeCuentahabiente,
      createConvenio,
      reestructurarConvenio,
      marcarPago,
      archivarConvenio,
      cancelarConvenio,
      eliminarConvenio,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
