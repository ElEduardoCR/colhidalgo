export type Cuentahabiente = {
  id: string;
  /** IdUsuario del sistema de la Junta (reporte de cortes). */
  idUsuario?: number;
  nombre: string;
  numeroCuenta: string;
  direccion: string;
  telefono: string;
  email?: string;
  saldoVencido: number;
  mesesAdeudo: number;
  ultimoPago?: string;
  tarifa?: string;
  /** Numero de medidor; vacio cuando la toma no tiene medidor instalado. */
  noMedidor?: string;
  ruta?: number;
  secuencia?: number;
  /** Consumo del periodo en m3. */
  consumo?: number;
  observaciones?: string;
  /** Fecha del reporte de cortes del que provienen los datos. */
  fechaCorte?: string;
  /** false cuando la cuenta dejo de aparecer en el padron. */
  activo?: boolean;
};

/** Tarifas del padron de la Junta. */
export const TARIFAS: Record<string, string> = {
  DSA: "Domestica sin alcantarillado",
  CSA: "Comercial sin alcantarillado",
  PAM: "Puesto / area municipal",
  EAE: "Escuela o entidad publica",
  D1B: "Domestica 1B",
};

export type EstadoPago = "pendiente" | "pagado" | "vencido";

export type PagoConvenio = {
  id: string;
  numero: number;
  fechaProgramada: string;
  monto: number;
  estado: EstadoPago;
  fechaPago?: string;
  notas?: string;
};

export type EstadoConvenio = "activo" | "completado" | "cancelado";

/** Un archivo de reporte de cortes ya importado. */
export type Corte = {
  id: string;
  fechaCorte: string;
  archivo?: string;
  totalCuentas: number;
  totalAdeudo: number;
  altas: number;
  pagosDetectados: number;
  montoDetectado: number;
  notas?: string;
  importadoEn?: string;
};

export type EstadoMovimiento = "propuesto" | "confirmado" | "descartado";

/** Pago detectado al comparar un corte contra el anterior. */
export type Movimiento = {
  id: string;
  corteId: string;
  cuentahabienteId: string;
  fechaPago?: string;
  saldoAnterior: number;
  saldoNuevo: number;
  cargoEstimado: number;
  montoDetectado: number;
  montoConfirmado?: number;
  origen: "ambos" | "fecha" | "saldo";
  estado: EstadoMovimiento;
  pagoConvenioId?: string;
  notas?: string;
};

export type TipoDescuento = "monto" | "porcentaje";

export type Convenio = {
  id: string;
  folio: string;
  cuentahabienteId: string;
  fechaCreacion: string;
  deudaTotal: number;
  enganche: number;
  numeroPagos: number;
  montoPago: number;
  periodicidad: "semanal" | "quincenal" | "mensual";
  fechaPrimerPago: string;
  /** Fecha real en que se paga el enganche; el calendario corre desde aqui. */
  fechaEnganche?: string;
  descuentoTipo?: TipoDescuento;
  descuentoValor?: number;
  responsable: string;
  observaciones?: string;
  estado: EstadoConvenio;
  pagos: PagoConvenio[];
  archivadoEn?: string;
  recordarDiaAntes?: boolean;
  recordarDiaDePago?: boolean;
};
