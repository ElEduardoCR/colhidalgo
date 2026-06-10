import { supabase } from "./supabase";
import type {
  Cuentahabiente,
  Convenio,
  EstadoPago,
  PagoConvenio,
} from "./types";

// === CUENTAHABIENTES ===
export async function getCuentahabientes(): Promise<Cuentahabiente[]> {
  const { data, error } = await supabase
    .from("cuentahabientes")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    nombre: row.nombre,
    numeroCuenta: row.numero_cuenta,
    direccion: row.direccion,
    telefono: row.telefono,
    email: row.email,
    saldoVencido: parseFloat(row.saldo_vencido),
    mesesAdeudo: row.meses_adeudo,
    ultimoPago: row.ultimo_pago,
  }));
}

export async function addCuentahabiente(
  c: Omit<Cuentahabiente, "id">,
): Promise<Cuentahabiente> {
  const id = `c-${Date.now()}`;
  const { error } = await supabase.from("cuentahabientes").insert({
    id,
    nombre: c.nombre,
    numero_cuenta: c.numeroCuenta,
    direccion: c.direccion,
    telefono: c.telefono,
    email: c.email || null,
    saldo_vencido: c.saldoVencido,
    meses_adeudo: c.mesesAdeudo,
    ultimo_pago: c.ultimoPago || null,
  });
  if (error) throw error;
  return { ...c, id };
}

export async function updateCuentahabiente(
  id: string,
  patch: Partial<Cuentahabiente>,
) {
  const update: any = {};
  if (patch.nombre !== undefined) update.nombre = patch.nombre;
  if (patch.numeroCuenta !== undefined) update.numero_cuenta = patch.numeroCuenta;
  if (patch.direccion !== undefined) update.direccion = patch.direccion;
  if (patch.telefono !== undefined) update.telefono = patch.telefono;
  if (patch.email !== undefined) update.email = patch.email || null;
  if (patch.saldoVencido !== undefined) update.saldo_vencido = patch.saldoVencido;
  if (patch.mesesAdeudo !== undefined) update.meses_adeudo = patch.mesesAdeudo;
  if (patch.ultimoPago !== undefined) update.ultimo_pago = patch.ultimoPago || null;

  const { error } = await supabase
    .from("cuentahabientes")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function removeCuentahabiente(id: string) {
  const { error } = await supabase
    .from("cuentahabientes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// === CONVENIOS ===
export async function getConvenios(): Promise<Convenio[]> {
  const { data: convenios, error: convError } = await supabase
    .from("convenios")
    .select("*")
    .order("fecha_creacion", { ascending: false });
  if (convError) throw convError;

  const { data: pagos, error: pagosError } = await supabase
    .from("pagos")
    .select("*");
  if (pagosError) throw pagosError;

  const pagosByConvenio = new Map<string, any[]>();
  (pagos ?? []).forEach((p: any) => {
    if (!pagosByConvenio.has(p.convenio_id))
      pagosByConvenio.set(p.convenio_id, []);
    pagosByConvenio.get(p.convenio_id)!.push(p);
  });

  return (convenios ?? []).map((row: any) => ({
    id: row.id,
    folio: row.folio,
    cuentahabienteId: row.cuentahabiente_id,
    fechaCreacion: row.fecha_creacion,
    deudaTotal: parseFloat(row.deuda_total),
    enganche: parseFloat(row.enganche),
    numeroPagos: row.numero_pagos,
    montoPago: parseFloat(row.monto_pago),
    periodicidad: row.periodicidad,
    fechaPrimerPago: row.fecha_primer_pago,
    responsable: row.responsable,
    observaciones: row.observaciones,
    estado: row.estado,
    archivadoEn: row.archivado_en,
    pagos: (pagosByConvenio.get(row.id) ?? [])
      .sort((a, b) => a.numero - b.numero)
      .map((p: any) => ({
        id: p.id,
        numero: p.numero,
        fechaProgramada: p.fecha_programada,
        monto: parseFloat(p.monto),
        estado: p.estado,
        fechaPago: p.fecha_pago,
        notas: p.notas,
      })),
  }));
}

let folioCounter = 0;
const nuevoFolio = async (existentes: Convenio[]) => {
  const year = new Date().getFullYear();
  const existsInYear = existentes.filter((c) =>
    c.folio.includes(`${year}`),
  ).length;
  return `CONV-${year}-${String(existsInYear + folioCounter + 1).padStart(4, "0")}`;
};

export async function createConvenio(
  input: Omit<
    Convenio,
    "id" | "folio" | "pagos" | "estado" | "fechaCreacion"
  > & {
    fechaCreacion?: string;
  },
  pagos: PagoConvenio[],
): Promise<Convenio> {
  const id = `conv-${Date.now()}`;
  const existentes = await getConvenios();
  const folio = await nuevoFolio(existentes);

  const { error: convError } = await supabase.from("convenios").insert({
    id,
    folio,
    cuentahabiente_id: input.cuentahabienteId,
    fecha_creacion: input.fechaCreacion || new Date().toISOString().slice(0, 10),
    deuda_total: input.deudaTotal,
    enganche: input.enganche,
    numero_pagos: input.numeroPagos,
    monto_pago: input.montoPago,
    periodicidad: input.periodicidad,
    fecha_primer_pago: input.fechaPrimerPago,
    responsable: input.responsable,
    observaciones: input.observaciones || null,
    estado: "activo",
  });
  if (convError) throw convError;

  // Insert pagos
  const pagosInsert = pagos.map((p) => ({
    id: p.id,
    convenio_id: id,
    numero: p.numero,
    fecha_programada: p.fechaProgramada,
    monto: p.monto,
    estado: p.estado,
    fecha_pago: p.fechaPago || null,
    notas: p.notas || null,
  }));

  const { error: pagosError } = await supabase
    .from("pagos")
    .insert(pagosInsert);
  if (pagosError) throw pagosError;

  return {
    ...input,
    id,
    folio,
    estado: "activo",
    pagos,
    fechaCreacion: input.fechaCreacion || new Date().toISOString().slice(0, 10),
  } as Convenio;
}

export async function updateConvenio(id: string, patch: Partial<Convenio>) {
  const update: any = {};
  if (patch.estado !== undefined) update.estado = patch.estado;
  if (patch.archivadoEn !== undefined) update.archivado_en = patch.archivadoEn || null;
  if (patch.observaciones !== undefined)
    update.observaciones = patch.observaciones || null;

  const { error } = await supabase
    .from("convenios")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function marcarPago(
  convenioId: string,
  pagoId: string,
  estado: EstadoPago,
  fechaPago?: string,
  notas?: string,
) {
  const update: any = { estado };
  if (estado === "pagado") {
    update.fecha_pago = fechaPago || new Date().toISOString().slice(0, 10);
  } else {
    update.fecha_pago = null;
  }
  if (notas !== undefined) update.notas = notas || null;

  const { error } = await supabase
    .from("pagos")
    .update(update)
    .eq("id", pagoId);
  if (error) throw error;

  // Check if all pagos are pagados -> completar convenio
  const { data: pagos, error: checkError } = await supabase
    .from("pagos")
    .select("estado")
    .eq("convenio_id", convenioId);
  if (checkError) throw checkError;

  const todosCompletos =
    pagos && pagos.length > 0 && pagos.every((p: any) => p.estado === "pagado");
  if (todosCompletos) {
    const { error: completeError } = await supabase
      .from("convenios")
      .update({ estado: "completado", archivado_en: new Date().toISOString().slice(0, 10) })
      .eq("id", convenioId);
    if (completeError) throw completeError;
  }
}

export async function reestructurarConvenio(
  id: string,
  input: {
    numeroPagos: number;
    montoPago: number;
    periodicidad: "semanal" | "quincenal" | "mensual";
    fechaPrimerPago: string;
    observaciones?: string;
  },
) {
  const { error: updateError } = await supabase
    .from("convenios")
    .update({
      numero_pagos: input.numeroPagos,
      monto_pago: input.montoPago,
      periodicidad: input.periodicidad,
      fecha_primer_pago: input.fechaPrimerPago,
      observaciones: input.observaciones || null,
    })
    .eq("id", id);
  if (updateError) throw updateError;

  // Delete old unpaid pagos
  const { error: deleteError } = await supabase
    .from("pagos")
    .delete()
    .eq("convenio_id", id)
    .neq("estado", "pagado");
  if (deleteError) throw deleteError;
}

export async function archivarConvenio(id: string) {
  const { error } = await supabase
    .from("convenios")
    .update({
      estado: "completado",
      archivado_en: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelarConvenio(id: string) {
  const { error } = await supabase
    .from("convenios")
    .update({
      estado: "cancelado",
      archivado_en: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarConvenio(id: string) {
  const { error } = await supabase
    .from("convenios")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
