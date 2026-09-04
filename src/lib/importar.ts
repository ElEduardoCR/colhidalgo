// Subruta del navegador: recibe el File del <input type="file"> directo.
// readSheet devuelve las filas de la primera hoja, sin el envoltorio de hojas.
import { readSheet } from "read-excel-file/browser";
import type { FilaCorte } from "./conciliar";

/**
 * Lee el Excel del "reporte de cortes" que emite el sistema de la Junta.
 *
 * Estructura esperada:
 *   fila 1   nombre de la Junta
 *   fila 2   "Reporte de cortes"
 *   fila 3   Fecha | <fecha del corte>
 *   fila 5   encabezados
 *   fila 6+  datos, y al final el marcador "FIN DEL REPORTE"
 *
 * Las columnas se localizan por su encabezado, no por posicion, para que el
 * archivo pueda traer columnas de mas o en otro orden.
 */

const ENCABEZADOS: Record<keyof ColumnasCorte, string[]> = {
  idUsuario: ["idusuario", "id usuario", "id"],
  numeroCuenta: ["cuenta", "no. cuenta", "numero de cuenta"],
  nombre: ["nombre", "cuentahabiente"],
  direccion: ["direccion", "domicilio"],
  noMedidor: ["no. medidor", "medidor", "no medidor"],
  ruta: ["ruta"],
  secuencia: ["sec.", "sec", "secuencia"],
  ultimoPago: ["ultimo pago", "último pago"],
  tarifa: ["tarifa"],
  adeudo: ["adeudo", "saldo"],
  consumo: ["consumo"],
};

type ColumnasCorte = {
  idUsuario: number;
  numeroCuenta: number;
  nombre: number;
  direccion: number;
  noMedidor: number;
  ruta: number;
  secuencia: number;
  ultimoPago: number;
  tarifa: number;
  adeudo: number;
  consumo: number;
};

export class ErrorImportacion extends Error {}

/**
 * La libreria declara las celdas de fecha como `typeof Date` en vez de `Date`,
 * asi que su tipo no sirve para leerlas. En ejecucion si llegan como Date.
 */
type Celda = string | number | boolean | Date | null;

const normal = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const texto = (v: unknown) =>
  v == null ? "" : String(v).replace(/\s+/g, " ").trim();

const numero = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, $]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const aISO = (v: unknown): string | undefined => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // El Date que devuelve la libreria viene en UTC; se toma tal cual para no
    // recorrer un dia al pasarlo a texto.
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const t = texto(v);
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : undefined;
};

export type ArchivoCorte = {
  fechaCorte: string;
  filas: FilaCorte[];
  /** Filas que se ignoraron por venir incompletas, para poder avisarlo. */
  descartadas: number;
};

export async function leerArchivoCorte(file: File): Promise<ArchivoCorte> {
  let bruto: Celda[][];
  try {
    bruto = (await readSheet(file)) as unknown as Celda[][];
  } catch {
    throw new ErrorImportacion(
      "No se pudo leer el archivo. Debe ser un Excel (.xlsx) del reporte de cortes.",
    );
  }
  if (!bruto?.length) throw new ErrorImportacion("El archivo esta vacio.");

  // Fecha del corte: la celda a la derecha de la etiqueta "Fecha".
  let fechaCorte: string | undefined;
  for (const fila of bruto.slice(0, 8)) {
    if (normal(fila?.[0]) === "fecha") {
      fechaCorte = aISO(fila[1]);
      break;
    }
  }

  // Encabezados: primera fila que contenga "cuenta" y "adeudo".
  let iEnc = -1;
  for (let i = 0; i < Math.min(bruto.length, 15); i++) {
    const celdas = (bruto[i] ?? []).map(normal);
    if (celdas.some((c) => c === "cuenta") && celdas.some((c) => c === "adeudo")) {
      iEnc = i;
      break;
    }
  }
  if (iEnc < 0) {
    throw new ErrorImportacion(
      "No se encontro la fila de encabezados. Se esperan al menos las columnas 'Cuenta' y 'adeudo'.",
    );
  }

  const celdas = (bruto[iEnc] ?? []).map(normal);
  const col = {} as ColumnasCorte;
  const faltantes: string[] = [];
  for (const [clave, alias] of Object.entries(ENCABEZADOS) as [
    keyof ColumnasCorte,
    string[],
  ][]) {
    const i = celdas.findIndex((c) => alias.includes(c));
    col[clave] = i;
    if (i < 0 && ["numeroCuenta", "nombre", "adeudo"].includes(clave)) {
      faltantes.push(alias[0]);
    }
  }
  if (faltantes.length) {
    throw new ErrorImportacion(
      `Al archivo le faltan columnas obligatorias: ${faltantes.join(", ")}.`,
    );
  }

  const dame = (fila: Celda[], i: number) => (i >= 0 ? fila[i] : undefined);

  const filas: FilaCorte[] = [];
  let descartadas = 0;

  for (const fila of bruto.slice(iEnc + 1)) {
    if (!fila) continue;
    const cuenta = texto(dame(fila, col.numeroCuenta));
    const nombre = texto(dame(fila, col.nombre));
    // La ultima linea del reporte es el marcador "FIN DEL REPORTE".
    if (!cuenta || !nombre) {
      if (fila.some((c) => texto(c))) descartadas += 1;
      continue;
    }
    const adeudo = numero(dame(fila, col.adeudo));
    if (adeudo == null) {
      descartadas += 1;
      continue;
    }
    filas.push({
      idUsuario: numero(dame(fila, col.idUsuario)) ?? 0,
      numeroCuenta: cuenta,
      nombre,
      direccion: texto(dame(fila, col.direccion)),
      noMedidor: texto(dame(fila, col.noMedidor)),
      ruta: numero(dame(fila, col.ruta)),
      secuencia: numero(dame(fila, col.secuencia)),
      ultimoPago: aISO(dame(fila, col.ultimoPago)),
      tarifa: texto(dame(fila, col.tarifa)),
      adeudo: Math.round(adeudo * 100) / 100,
      consumo: numero(dame(fila, col.consumo)),
    });
  }

  if (!filas.length) {
    throw new ErrorImportacion(
      "El archivo no tiene filas de cuentas que se puedan leer.",
    );
  }

  const cuentas = new Set(filas.map((f) => f.numeroCuenta));
  if (cuentas.size !== filas.length) {
    throw new ErrorImportacion(
      `El archivo trae numeros de cuenta repetidos (${filas.length - cuentas.size}). Revisa el reporte antes de importarlo.`,
    );
  }

  return {
    fechaCorte: fechaCorte ?? new Date().toISOString().slice(0, 10),
    filas,
    descartadas,
  };
}
