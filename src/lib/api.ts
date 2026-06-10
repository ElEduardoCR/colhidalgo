import { supabase } from "./supabase";
import type { Convenio, Cuentahabiente, EstadoPago, PagoConvenio } from "./types";

// ===== Mapeos fila <-> objeto =====
const rowToCuenta = (r: any): Cuentahabiente => ({
  id: r.id,
  nombre: r.nombre,
  numeroCuenta: r.numero_cuenta,
  direccion: r.direccion ?? "",
  telefono: r.telefono ?? "",
  email: r.email ?? "",
  saldoVencido: parseFloat(r.saldo_vencido ?? 0),
  mesesAdeudo: r.meses_adeudo ?? 0,
  ultimoPago: r.ultimo_pago ?? "",
  tarifa: r.tarifa ?? "",
});

const cuentaToRow = (c: Cuentahabiente) => ({
  id: c.id,
  nombre: c.nombre,
  numero_cuenta: c.numeroCuenta,
  direccion: c.direccion || null,
  telefono: c.telefono || null,
  email: c.email || null,
  saldo_vencido: c.saldoVencido,
  meses_adeudo: c.mesesAdeudo,
  ultimo_pago: c.ultimoPago || null,
  tarifa: c.tarifa || null,
});

const rowToPago = (r: any): PagoConvenio => ({
  id: r.id,
  numero: r.numero,
  fechaProgramada: r.fecha_programada,
  monto: parseFloat(r.monto),
  estado: r.estado,
  fechaPago: r.fecha_pago ?? undefined,
  notas: r.notas ?? undefined,
});

const pagoToRow = (convenioId: string, p: PagoConvenio) => ({
  id: p.id,
  convenio_id: convenioId,
  numero: p.numero,
  fecha_programada: p.fechaProgramada,
  monto: p.monto,
  estado: p.estado,
  fecha_pago: p.fechaPago || null,
  notas: p.notas || null,
});

// ===== CUENTAHABIENTES =====
export async function getCuentahabientes(): Promise<Cuentahabiente[]> {
  const { data, error } = await supabase
    .from("cuentahabientes")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map(rowToCuenta);
}

export async function insertCuentahabiente(c: Cuentahabiente) {
  const { error } = await supabase.from("cuentahabientes").insert(cuentaToRow(c));
  if (error) throw error;
}

export async function updateCuentahabienteDB(c: Cuentahabiente) {
  const { error } = await supabase
    .from("cuentahabientes")
    .update(cuentaToRow(c))
    .eq("id", c.id);
  if (error) throw error;
}

export async function deleteCuentahabiente(id: string) {
  const { error } = await supabase.from("cuentahabientes").delete().eq("id", id);
  if (error) throw error;
}

// ===== CONVENIOS =====
export async function getConvenios(): Promise<Convenio[]> {
  const [{ data: convenios, error: e1 }, { data: pagos, error: e2 }] =
    await Promise.all([
      supabase.from("convenios").select("*").order("fecha_creacion", {
        ascending: false,
      }),
      supabase.from("pagos").select("*"),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const porConvenio = new Map<string, PagoConvenio[]>();
  (pagos ?? []).forEach((p: any) => {
    const arr = porConvenio.get(p.convenio_id) ?? [];
    arr.push(rowToPago(p));
    porConvenio.set(p.convenio_id, arr);
  });

  return (convenios ?? []).map((r: any) => ({
    id: r.id,
    folio: r.folio,
    cuentahabienteId: r.cuentahabiente_id,
    fechaCreacion: r.fecha_creacion,
    deudaTotal: parseFloat(r.deuda_total),
    enganche: parseFloat(r.enganche),
    numeroPagos: r.numero_pagos,
    montoPago: parseFloat(r.monto_pago),
    periodicidad: r.periodicidad,
    fechaPrimerPago: r.fecha_primer_pago,
    responsable: r.responsable,
    observaciones: r.observaciones ?? undefined,
    estado: r.estado,
    archivadoEn: r.archivado_en ?? undefined,
    pagos: (porConvenio.get(r.id) ?? []).sort((a, b) => a.numero - b.numero),
  }));
}

const convenioToRow = (c: Convenio) => ({
  id: c.id,
  folio: c.folio,
  cuentahabiente_id: c.cuentahabienteId,
  fecha_creacion: c.fechaCreacion,
  deuda_total: c.deudaTotal,
  enganche: c.enganche,
  numero_pagos: c.numeroPagos,
  monto_pago: c.montoPago,
  periodicidad: c.periodicidad,
  fecha_primer_pago: c.fechaPrimerPago,
  responsable: c.responsable,
  observaciones: c.observaciones || null,
  estado: c.estado,
  archivado_en: c.archivadoEn || null,
});

export async function insertConvenio(c: Convenio) {
  const { error: e1 } = await supabase.from("convenios").insert(convenioToRow(c));
  if (e1) throw e1;
  if (c.pagos.length) {
    const { error: e2 } = await supabase
      .from("pagos")
      .insert(c.pagos.map((p) => pagoToRow(c.id, p)));
    if (e2) throw e2;
  }
}

export async function updateConvenioFields(id: string, patch: Partial<Convenio>) {
  const row: any = {};
  if (patch.numeroPagos !== undefined) row.numero_pagos = patch.numeroPagos;
  if (patch.montoPago !== undefined) row.monto_pago = patch.montoPago;
  if (patch.periodicidad !== undefined) row.periodicidad = patch.periodicidad;
  if (patch.fechaPrimerPago !== undefined)
    row.fecha_primer_pago = patch.fechaPrimerPago;
  if (patch.observaciones !== undefined)
    row.observaciones = patch.observaciones || null;
  if (patch.estado !== undefined) row.estado = patch.estado;
  if (patch.archivadoEn !== undefined)
    row.archivado_en = patch.archivadoEn || null;
  const { error } = await supabase.from("convenios").update(row).eq("id", id);
  if (error) throw error;
}

/** Reemplaza por completo el calendario de pagos de un convenio. */
export async function replacePagos(convenioId: string, pagos: PagoConvenio[]) {
  const { error: e1 } = await supabase
    .from("pagos")
    .delete()
    .eq("convenio_id", convenioId);
  if (e1) throw e1;
  if (pagos.length) {
    const { error: e2 } = await supabase
      .from("pagos")
      .insert(pagos.map((p) => pagoToRow(convenioId, p)));
    if (e2) throw e2;
  }
}

export async function updatePagoDB(
  pagoId: string,
  estado: EstadoPago,
  fechaPago?: string,
  notas?: string,
) {
  const row: any = {
    estado,
    fecha_pago: estado === "pagado" ? fechaPago ?? null : null,
  };
  if (notas !== undefined) row.notas = notas || null;
  const { error } = await supabase.from("pagos").update(row).eq("id", pagoId);
  if (error) throw error;
}

export async function deleteConvenio(id: string) {
  const { error } = await supabase.from("convenios").delete().eq("id", id);
  if (error) throw error;
}
