import type { Cuentahabiente } from "./types";

/** Una fila del reporte de cortes, ya normalizada. */
export type FilaCorte = {
  idUsuario: number;
  numeroCuenta: string;
  nombre: string;
  direccion: string;
  noMedidor: string;
  ruta?: number;
  secuencia?: number;
  ultimoPago?: string; // ISO yyyy-mm-dd
  tarifa: string;
  adeudo: number;
  consumo?: number;
};

/**
 * Como se detecto el pago:
 *  - "ambos"  avanzo la fecha de ultimo pago y ademas bajo el saldo. Es el caso
 *             confiable y no necesita revision.
 *  - "fecha"  avanzo la fecha pero el saldo no bajo: pago menos que el recibo
 *             del mes, o el cargo se aplico el mismo dia. El monto es estimado.
 *  - "saldo"  bajo el saldo sin que avanzara la fecha. Suele ser un ajuste o
 *             una cancelacion de cargo, no un pago.
 */
export type OrigenPago = "ambos" | "fecha" | "saldo";

export type PagoDetectado = {
  cuentahabienteId: string;
  numeroCuenta: string;
  nombre: string;
  fechaPago?: string;
  saldoAnterior: number;
  saldoNuevo: number;
  cargoEstimado: number;
  montoDetectado: number;
  origen: OrigenPago;
  /** true cuando el monto sale de una resta limpia y no de una estimacion. */
  exacto: boolean;
};

export type CambioDatos = {
  cuentahabienteId: string;
  numeroCuenta: string;
  nombre: string;
  campos: { campo: string; antes: string; ahora: string }[];
};

export type Conciliacion = {
  fechaCorte: string;
  /** Cargo del periodo por tarifa, estimado con quienes no pagaron. */
  cargoPorTarifa: Record<string, number>;
  /** Si es false, entre los dos cortes no se facturo (cargo ~ 0). */
  huboFacturacion: boolean;
  altas: FilaCorte[];
  pagos: PagoDetectado[];
  cambios: CambioDatos[];
  /** Cuentas en la base que ya no vienen en el archivo. */
  ausentes: Cuentahabiente[];
  sinCambio: number;
  totalAdeudo: number;
  totalCuentas: number;
};

const redondear = (n: number) => Math.round(n * 100) / 100;

const mediana = (xs: number[]): number => {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

const limpiar = (t: string | undefined | null) =>
  (t ?? "").replace(/\s+/g, " ").trim();

/**
 * Estima cuanto se cargo en el periodo, por tarifa, mirando solo a las cuentas
 * que NO pagaron: lo que les subio el saldo es el recibo del mes.
 *
 * Sin esto, quien pago menos de lo que le facturaron aparece como si no hubiera
 * pagado. En el corte de agosto a septiembre eso pasaba en 11 cuentas.
 */
function estimarCargos(
  pares: { previo: Cuentahabiente; fila: FilaCorte; pago: boolean }[],
): { cargoPorTarifa: Record<string, number>; huboFacturacion: boolean } {
  const porTarifa: Record<string, number[]> = {};
  const todos: number[] = [];

  for (const { previo, fila, pago } of pares) {
    if (pago) continue; // los que pagaron mezclan cargo y abono
    const delta = fila.adeudo - previo.saldoVencido;
    if (delta <= 0) continue;
    (porTarifa[fila.tarifa] ??= []).push(delta);
    todos.push(delta);
  }

  const global = mediana(todos);
  const cargoPorTarifa: Record<string, number> = {};
  for (const [tarifa, xs] of Object.entries(porTarifa)) {
    // Cada tarifa cobra distinto, asi que su propia mediana vale mas que la
    // global aunque haya pocas muestras. Solo con una se usa la global.
    cargoPorTarifa[tarifa] = redondear(xs.length >= 2 ? mediana(xs) : global);
  }

  // Si casi nadie subio de saldo, entre los dos cortes no hubo facturacion.
  const conCargo = todos.length;
  const comparables = pares.filter((p) => !p.pago).length;
  const huboFacturacion = comparables > 0 && conCargo / comparables > 0.5;

  return {
    cargoPorTarifa: huboFacturacion ? cargoPorTarifa : {},
    huboFacturacion,
  };
}

/**
 * Compara el archivo nuevo contra lo que hay en la base y devuelve todo lo que
 * cambiaria, sin tocar nada. Quien decide es la pantalla de importacion.
 */
export function conciliar(
  filas: FilaCorte[],
  actuales: Cuentahabiente[],
  fechaCorte: string,
): Conciliacion {
  const porCuenta = new Map(actuales.map((c) => [c.numeroCuenta, c]));
  const vistas = new Set<string>();

  const altas: FilaCorte[] = [];
  const pares: { previo: Cuentahabiente; fila: FilaCorte; pago: boolean }[] = [];

  for (const fila of filas) {
    const previo = porCuenta.get(fila.numeroCuenta);
    if (!previo) {
      altas.push(fila);
      continue;
    }
    vistas.add(fila.numeroCuenta);
    const avanzo =
      !!fila.ultimoPago &&
      !!previo.ultimoPago &&
      fila.ultimoPago > previo.ultimoPago;
    const bajo = previo.saldoVencido - fila.adeudo > 0.005;
    pares.push({ previo, fila, pago: avanzo || bajo });
  }

  const { cargoPorTarifa, huboFacturacion } = estimarCargos(pares);

  const pagos: PagoDetectado[] = [];
  const cambios: CambioDatos[] = [];
  let sinCambio = 0;

  for (const { previo, fila, pago } of pares) {
    const avanzo =
      !!fila.ultimoPago &&
      !!previo.ultimoPago &&
      fila.ultimoPago > previo.ultimoPago;
    const deltaSaldo = previo.saldoVencido - fila.adeudo;
    const bajo = deltaSaldo > 0.005;

    if (pago) {
      const origen: OrigenPago = avanzo && bajo ? "ambos" : avanzo ? "fecha" : "saldo";
      const cargo = avanzo ? (cargoPorTarifa[fila.tarifa] ?? 0) : 0;
      const monto = Math.max(redondear(deltaSaldo + cargo), 0);
      pagos.push({
        cuentahabienteId: previo.id,
        numeroCuenta: fila.numeroCuenta,
        nombre: fila.nombre,
        fechaPago: fila.ultimoPago,
        saldoAnterior: previo.saldoVencido,
        saldoNuevo: fila.adeudo,
        cargoEstimado: cargo,
        montoDetectado: monto,
        origen,
        // Solo es exacto cuando bajo el saldo y no hubo cargo de por medio.
        exacto: bajo && cargo === 0,
      });
    }

    const difs: CambioDatos["campos"] = [];
    const comparar = (campo: string, antes: string, ahora: string) => {
      if (limpiar(antes) !== limpiar(ahora) && limpiar(ahora))
        difs.push({ campo, antes: limpiar(antes), ahora: limpiar(ahora) });
    };
    comparar("Nombre", previo.nombre, fila.nombre);
    comparar("Domicilio", previo.direccion, fila.direccion);
    comparar("Medidor", previo.noMedidor ?? "", fila.noMedidor);
    comparar("Tarifa", previo.tarifa ?? "", fila.tarifa);
    if (difs.length) {
      cambios.push({
        cuentahabienteId: previo.id,
        numeroCuenta: fila.numeroCuenta,
        nombre: fila.nombre,
        campos: difs,
      });
    }
    if (!pago && !difs.length) sinCambio += 1;
  }

  const ausentes = actuales.filter((c) => !vistas.has(c.numeroCuenta));

  return {
    fechaCorte,
    cargoPorTarifa,
    huboFacturacion,
    altas,
    pagos: pagos.sort((a, b) => b.montoDetectado - a.montoDetectado),
    cambios,
    ausentes,
    sinCambio,
    totalAdeudo: redondear(filas.reduce((s, f) => s + f.adeudo, 0)),
    totalCuentas: filas.length,
  };
}
