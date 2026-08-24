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
  responsable: string;
  observaciones?: string;
  estado: EstadoConvenio;
  pagos: PagoConvenio[];
  archivadoEn?: string;
  recordarDiaAntes?: boolean;
  recordarDiaDePago?: boolean;
};
