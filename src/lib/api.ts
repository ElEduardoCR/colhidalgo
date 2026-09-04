import { supabase } from "./supabase";
import type {
  Convenio,
  Corte,
  Cuentahabiente,
  EstadoPago,
  Movimiento,
  PagoConvenio,
} from "./types";

// ===== Mapeos fila <-> objeto =====
const rowToCuenta = (r: any): Cuentahabiente => ({
  id: r.id,
  idUsuario: r.id_usuario ?? undefined,
  nombre: r.nombre,
  numeroCuenta: r.numero_cuenta,
  direccion: r.direccion ?? "",
  telefono: r.telefono ?? "",
  email: r.email ?? "",
  saldoVencido: parseFloat(r.saldo_vencido ?? 0),
  mesesAdeudo: r.meses_adeudo ?? 0,
  ultimoPago: r.ultimo_pago ?? "",
  tarifa: r.tarifa ?? "",
  noMedidor: r.no_medidor ?? "",
  ruta: r.ruta ?? undefined,
  secuencia: r.secuencia ?? undefined,
  consumo: r.consumo ?? undefined,
  observaciones: r.observaciones ?? "",
  fechaCorte: r.fecha_corte ?? undefined,
  activo: r.activo ?? true,
});

const cuentaToRow = (c: Cuentahabiente) => ({
  id: c.id,
  id_usuario: c.idUsuario ?? null,
  nombre: c.nombre,
  numero_cuenta: c.numeroCuenta,
  direccion: c.direccion || null,
  telefono: c.telefono || null,
  email: c.email || null,
  saldo_vencido: c.saldoVencido,
  meses_adeudo: c.mesesAdeudo,
  ultimo_pago: c.ultimoPago || null,
  tarifa: c.tarifa || null,
  no_medidor: c.noMedidor || null,
  ruta: c.ruta ?? null,
  secuencia: c.secuencia ?? null,
  consumo: c.consumo ?? null,
  observaciones: c.observaciones || null,
  fecha_corte: c.fechaCorte || null,
  activo: c.activo ?? true,
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
    .order("saldo_vencido", { ascending: false });
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
    fechaEnganche: r.fecha_enganche ?? undefined,
    descuentoTipo: r.descuento_tipo ?? undefined,
    descuentoValor: r.descuento_valor ? parseFloat(r.descuento_valor) : 0,
    responsable: r.responsable,
    observaciones: r.observaciones ?? undefined,
    estado: r.estado,
    archivadoEn: r.archivado_en ?? undefined,
    recordarDiaAntes: r.recordar_dia_antes ?? true,
    recordarDiaDePago: r.recordar_dia_de_pago ?? true,
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
  fecha_enganche: c.fechaEnganche || null,
  descuento_tipo: c.descuentoTipo || null,
  descuento_valor: c.descuentoValor ?? 0,
  responsable: c.responsable,
  observaciones: c.observaciones || null,
  estado: c.estado,
  archivado_en: c.archivadoEn || null,
  recordar_dia_antes: c.recordarDiaAntes ?? true,
  recordar_dia_de_pago: c.recordarDiaDePago ?? true,
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
  if (patch.fechaEnganche !== undefined)
    row.fecha_enganche = patch.fechaEnganche || null;
  if (patch.descuentoTipo !== undefined)
    row.descuento_tipo = patch.descuentoTipo || null;
  if (patch.descuentoValor !== undefined)
    row.descuento_valor = patch.descuentoValor;
  if (patch.observaciones !== undefined)
    row.observaciones = patch.observaciones || null;
  if (patch.estado !== undefined) row.estado = patch.estado;
  if (patch.archivadoEn !== undefined)
    row.archivado_en = patch.archivadoEn || null;
  if (patch.recordarDiaAntes !== undefined)
    row.recordar_dia_antes = patch.recordarDiaAntes;
  if (patch.recordarDiaDePago !== undefined)
    row.recordar_dia_de_pago = patch.recordarDiaDePago;
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

// ===== PADRON EN BLOQUE =====
/**
 * Guarda el padron completo empatando por numero de cuenta. Se manda por
 * tandas porque son cientos de filas y una sola peticion se vuelve pesada.
 */
export async function upsertCuentahabientes(cuentas: Cuentahabiente[]) {
  const TANDA = 200;
  for (let i = 0; i < cuentas.length; i += TANDA) {
    const { error } = await supabase
      .from("cuentahabientes")
      .upsert(cuentas.slice(i, i + TANDA).map(cuentaToRow), {
        onConflict: "numero_cuenta",
      });
    if (error) throw error;
  }
}

// ===== CORTES =====
const rowToCorte = (r: any): Corte => ({
  id: r.id,
  fechaCorte: r.fecha_corte,
  archivo: r.archivo ?? undefined,
  totalCuentas: r.total_cuentas ?? 0,
  totalAdeudo: parseFloat(r.total_adeudo ?? 0),
  altas: r.altas ?? 0,
  pagosDetectados: r.pagos_detectados ?? 0,
  montoDetectado: parseFloat(r.monto_detectado ?? 0),
  notas: r.notas ?? undefined,
  importadoEn: r.importado_en ?? undefined,
});

export async function getCortes(): Promise<Corte[]> {
  const { data, error } = await supabase
    .from("cortes")
    .select("*")
    .order("fecha_corte", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToCorte);
}

export async function insertCorte(c: Corte) {
  const { error } = await supabase.from("cortes").insert({
    id: c.id,
    fecha_corte: c.fechaCorte,
    archivo: c.archivo || null,
    total_cuentas: c.totalCuentas,
    total_adeudo: c.totalAdeudo,
    altas: c.altas,
    pagos_detectados: c.pagosDetectados,
    monto_detectado: c.montoDetectado,
    notas: c.notas || null,
  });
  if (error) throw error;
}

// ===== MOVIMIENTOS (pagos detectados) =====
const rowToMovimiento = (r: any): Movimiento => ({
  id: r.id,
  corteId: r.corte_id,
  cuentahabienteId: r.cuentahabiente_id,
  fechaPago: r.fecha_pago ?? undefined,
  saldoAnterior: parseFloat(r.saldo_anterior ?? 0),
  saldoNuevo: parseFloat(r.saldo_nuevo ?? 0),
  cargoEstimado: parseFloat(r.cargo_estimado ?? 0),
  montoDetectado: parseFloat(r.monto_detectado ?? 0),
  montoConfirmado:
    r.monto_confirmado == null ? undefined : parseFloat(r.monto_confirmado),
  origen: r.origen,
  estado: r.estado,
  pagoConvenioId: r.pago_convenio_id ?? undefined,
  notas: r.notas ?? undefined,
});

const movimientoToRow = (m: Movimiento) => ({
  id: m.id,
  corte_id: m.corteId,
  cuentahabiente_id: m.cuentahabienteId,
  fecha_pago: m.fechaPago || null,
  saldo_anterior: m.saldoAnterior,
  saldo_nuevo: m.saldoNuevo,
  cargo_estimado: m.cargoEstimado,
  monto_detectado: m.montoDetectado,
  monto_confirmado: m.montoConfirmado ?? null,
  origen: m.origen,
  estado: m.estado,
  pago_convenio_id: m.pagoConvenioId || null,
  notas: m.notas || null,
});

export async function getMovimientos(): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .order("fecha_pago", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMovimiento);
}

export async function insertMovimientos(ms: Movimiento[]) {
  const TANDA = 200;
  for (let i = 0; i < ms.length; i += TANDA) {
    const { error } = await supabase
      .from("movimientos")
      .upsert(ms.slice(i, i + TANDA).map(movimientoToRow), {
        onConflict: "corte_id,cuentahabiente_id",
      });
    if (error) throw error;
  }
}

// ===== CONFIGURACION =====
export async function getConfiguracion(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("configuracion").select("*");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: any) => [r.clave, r.valor]));
}

export async function setConfiguracion(clave: string, valor: string) {
  const { error } = await supabase
    .from("configuracion")
    .upsert({ clave, valor, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ===== FOTO DE CADA CORTE =====
/** Guarda todas las filas del archivo tal como se importaron. */
export async function insertCorteDetalle(
  corteId: string,
  filas: {
    numeroCuenta: string;
    idUsuario?: number;
    nombre: string;
    direccion: string;
    noMedidor?: string;
    ruta?: number;
    secuencia?: number;
    ultimoPago?: string;
    tarifa?: string;
    adeudo: number;
    mesesAdeudo: number;
    consumo?: number;
  }[],
) {
  const TANDA = 200;
  for (let i = 0; i < filas.length; i += TANDA) {
    const { error } = await supabase.from("corte_detalle").upsert(
      filas.slice(i, i + TANDA).map((f) => ({
        corte_id: corteId,
        numero_cuenta: f.numeroCuenta,
        id_usuario: f.idUsuario ?? null,
        nombre: f.nombre,
        direccion: f.direccion || null,
        no_medidor: f.noMedidor || null,
        ruta: f.ruta ?? null,
        secuencia: f.secuencia ?? null,
        ultimo_pago: f.ultimoPago || null,
        tarifa: f.tarifa || null,
        saldo_vencido: f.adeudo,
        meses_adeudo: f.mesesAdeudo,
        consumo: f.consumo ?? null,
      })),
      { onConflict: "corte_id,numero_cuenta" },
    );
    if (error) throw error;
  }
}

/**
 * Revierte por completo la importacion mas reciente. Todo ocurre dentro de una
 * funcion de Postgres para que sea atomico.
 */
export async function deshacerCorteDB(corteId: string) {
  const { data, error } = await supabase.rpc("deshacer_corte", {
    p_corte_id: corteId,
  });
  if (error) throw error;
  return data as {
    corte_deshecho: string;
    regreso_a: string;
    cuentas_restauradas: number;
    cuentas_eliminadas: number;
    letras_revertidas: number;
    movimientos_borrados: number;
  };
}
