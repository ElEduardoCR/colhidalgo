import type { Convenio, Corte, Cuentahabiente, Movimiento } from "./types";

/**
 * Resumen de lo que paso entre un corte y el anterior. Todo se calcula a partir
 * de los movimientos ya guardados, que traen el saldo de antes y el de despues,
 * asi que no hace falta volver a leer el archivo.
 */

export type LetraAcreditada = {
  nombre: string;
  folio: string;
  numero: number;
  totalLetras: number;
  montoAcordado: number;
  montoPagado: number;
  /** Positiva si pago de mas, negativa si le falto. */
  diferencia: number;
  fechaProgramada: string;
  fechaPago?: string;
  diasAtraso: number;
};

export type LetraVencida = {
  cuentahabienteId: string;
  nombre: string;
  folio: string;
  convenioId: string;
  numero: number;
  totalLetras: number;
  monto: number;
  fechaProgramada: string;
  diasAtraso: number;
  /** true si la cuenta si registro un pago en este corte, aunque sin acreditar. */
  pagoEnEsteCorte: boolean;
};

/** Una linea del detalle de pagos del corte. */
export type PagoDetalle = {
  cuentahabienteId: string;
  idUsuario?: number;
  numeroCuenta: string;
  nombre: string;
  direccion: string;
  tarifa: string;
  noMedidor: string;
  fechaPago?: string;
  saldoAnterior: number;
  saldoNuevo: number;
  monto: number;
  /** Traia adeudo por encima del umbral antes de pagar. */
  eraMoroso: boolean;
  salioDeMorosidad: boolean;
  /** El monto salio de una resta limpia, no de una estimacion. */
  exacto: boolean;
  origen: Movimiento["origen"];
  folioConvenio?: string;
};

export type ResumenCorte = {
  corte: Corte;
  anterior?: Corte;
  padron: {
    cuentas: number;
    adeudo: number;
    variacionAdeudo: number;
    variacionCuentas: number;
    morosos: number;
  };
  pagos: {
    total: number;
    monto: number;
    alCorriente: { n: number; monto: number };
    morosos: { n: number; monto: number };
    salieronDeMorosidad: number;
    siguenMorosos: number;
    porTarifa: { tarifa: string; n: number; monto: number }[];
    exactos: number;
    estimados: number;
    descartados: number;
  };
  convenios: {
    acreditadas: LetraAcreditada[];
    vencidas: LetraVencida[];
  };
  /** Una fila por pago confirmado, para la tabla del detalle. */
  detalle: PagoDetalle[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

const dias = (desde: string, hasta: string) =>
  Math.round(
    (new Date(hasta + "T12:00:00").getTime() -
      new Date(desde + "T12:00:00").getTime()) /
      86400000,
  );

export function resumirCorte(
  corte: Corte,
  cortes: Corte[],
  movimientos: Movimiento[],
  cuentahabientes: Cuentahabiente[],
  convenios: Convenio[],
  umbral: number,
): ResumenCorte {
  const anterior = cortes
    .filter(
      (c) =>
        c.id !== corte.id &&
        (c.fechaCorte < corte.fechaCorte ||
          (c.fechaCorte === corte.fechaCorte && c.id < corte.id)),
    )
    .sort((a, b) => b.fechaCorte.localeCompare(a.fechaCorte))[0];

  const delCorte = movimientos.filter((m) => m.corteId === corte.id);
  const confirmados = delCorte.filter((m) => m.estado === "confirmado");
  const porId = new Map(cuentahabientes.map((c) => [c.id, c]));
  const monto = (m: Movimiento) => m.montoConfirmado ?? m.montoDetectado;

  // Ser moroso se juzga con el saldo que traia ANTES de pagar: es lo que
  // distingue a quien venia arrastrando adeudo de quien solo pago su recibo.
  const morosos = confirmados.filter((m) => m.saldoAnterior >= umbral);
  const alCorriente = confirmados.filter((m) => m.saldoAnterior < umbral);

  const tarifas = new Map<string, { n: number; monto: number }>();
  for (const m of confirmados) {
    const t = porId.get(m.cuentahabienteId)?.tarifa || "—";
    const acc = tarifas.get(t) ?? { n: 0, monto: 0 };
    acc.n += 1;
    acc.monto = r2(acc.monto + monto(m));
    tarifas.set(t, acc);
  }

  // ---- Convenios ----
  const acreditadas: LetraAcreditada[] = [];
  for (const m of confirmados) {
    if (!m.pagoConvenioId) continue;
    const conv = convenios.find((c) =>
      c.pagos.some((p) => p.id === m.pagoConvenioId),
    );
    const letra = conv?.pagos.find((p) => p.id === m.pagoConvenioId);
    if (!conv || !letra) continue;
    const pagado = monto(m);
    acreditadas.push({
      nombre: porId.get(m.cuentahabienteId)?.nombre ?? "—",
      folio: conv.folio,
      numero: letra.numero,
      totalLetras: conv.numeroPagos,
      montoAcordado: letra.monto,
      montoPagado: pagado,
      diferencia: r2(pagado - letra.monto),
      fechaProgramada: letra.fechaProgramada,
      fechaPago: m.fechaPago,
      diasAtraso: m.fechaPago
        ? Math.max(dias(letra.fechaProgramada, m.fechaPago), 0)
        : 0,
    });
  }

  const pagaronEnEsteCorte = new Set(
    confirmados.map((m) => m.cuentahabienteId),
  );

  const vencidas: LetraVencida[] = [];
  for (const c of convenios) {
    if (c.estado !== "activo") continue;
    for (const p of c.pagos) {
      if (p.estado === "pagado") continue;
      if (p.fechaProgramada > corte.fechaCorte) continue;
      vencidas.push({
        cuentahabienteId: c.cuentahabienteId,
        nombre: porId.get(c.cuentahabienteId)?.nombre ?? "—",
        folio: c.folio,
        convenioId: c.id,
        numero: p.numero,
        totalLetras: c.numeroPagos,
        monto: p.monto,
        fechaProgramada: p.fechaProgramada,
        diasAtraso: dias(p.fechaProgramada, corte.fechaCorte),
        pagoEnEsteCorte: pagaronEnEsteCorte.has(c.cuentahabienteId),
      });
    }
  }
  vencidas.sort((a, b) => b.diasAtraso - a.diasAtraso);

  return {
    corte,
    anterior,
    padron: {
      cuentas: corte.totalCuentas,
      adeudo: corte.totalAdeudo,
      variacionAdeudo: anterior ? r2(corte.totalAdeudo - anterior.totalAdeudo) : 0,
      variacionCuentas: anterior ? corte.totalCuentas - anterior.totalCuentas : 0,
      morosos: cuentahabientes.filter((c) => c.saldoVencido >= umbral).length,
    },
    pagos: {
      total: confirmados.length,
      monto: r2(confirmados.reduce((s, m) => s + monto(m), 0)),
      alCorriente: {
        n: alCorriente.length,
        monto: r2(alCorriente.reduce((s, m) => s + monto(m), 0)),
      },
      morosos: {
        n: morosos.length,
        monto: r2(morosos.reduce((s, m) => s + monto(m), 0)),
      },
      salieronDeMorosidad: morosos.filter((m) => m.saldoNuevo < umbral).length,
      siguenMorosos: morosos.filter((m) => m.saldoNuevo >= umbral).length,
      porTarifa: Array.from(tarifas, ([tarifa, v]) => ({ tarifa, ...v })).sort(
        (a, b) => b.monto - a.monto,
      ),
      exactos: confirmados.filter((m) => m.cargoEstimado === 0).length,
      estimados: confirmados.filter((m) => m.cargoEstimado > 0).length,
      descartados: delCorte.filter((m) => m.estado === "descartado").length,
    },
    convenios: { acreditadas, vencidas },
    detalle: confirmados
      .map((m): PagoDetalle => {
        const c = porId.get(m.cuentahabienteId);
        const conv = m.pagoConvenioId
          ? convenios.find((x) => x.pagos.some((p) => p.id === m.pagoConvenioId))
          : undefined;
        return {
          cuentahabienteId: m.cuentahabienteId,
          idUsuario: c?.idUsuario,
          numeroCuenta: c?.numeroCuenta ?? "—",
          nombre: c?.nombre ?? "—",
          direccion: c?.direccion ?? "",
          tarifa: c?.tarifa ?? "",
          noMedidor: c?.noMedidor ?? "",
          fechaPago: m.fechaPago,
          saldoAnterior: m.saldoAnterior,
          saldoNuevo: m.saldoNuevo,
          monto: monto(m),
          eraMoroso: m.saldoAnterior >= umbral,
          salioDeMorosidad: m.saldoAnterior >= umbral && m.saldoNuevo < umbral,
          exacto: m.cargoEstimado === 0,
          origen: m.origen,
          folioConvenio: conv?.folio,
        };
      })
      .sort((a, b) => b.monto - a.monto),
  };
}
