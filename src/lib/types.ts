export type Cuentahabiente = {
  id: string;
  nombre: string;
  numeroCuenta: string;
  direccion: string;
  telefono: string;
  email?: string;
  saldoVencido: number;
  mesesAdeudo: number;
  ultimoPago?: string;
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
};
