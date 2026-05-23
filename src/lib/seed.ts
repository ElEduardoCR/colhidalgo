import type { Cuentahabiente, Convenio } from "./types";

export const cuentahabientesSeed: Cuentahabiente[] = [
  {
    id: "c-001",
    nombre: "Maria Lopez Hernandez",
    numeroCuenta: "0001-A",
    direccion: "Calle Hidalgo 12, Col. Centro",
    telefono: "5215512345678",
    email: "maria.lopez@example.com",
    saldoVencido: 1850,
    mesesAdeudo: 5,
    ultimoPago: "2025-12-10",
  },
  {
    id: "c-002",
    nombre: "Jose Ramirez Soto",
    numeroCuenta: "0017-B",
    direccion: "Av. Juarez 45, Col. La Loma",
    telefono: "5215587654321",
    saldoVencido: 920,
    mesesAdeudo: 3,
    ultimoPago: "2026-01-22",
  },
  {
    id: "c-003",
    nombre: "Lucia Mendoza Cruz",
    numeroCuenta: "0042-C",
    direccion: "Privada del Sol 8, Col. Las Flores",
    telefono: "5215511223344",
    email: "lucia.mc@example.com",
    saldoVencido: 3260,
    mesesAdeudo: 8,
    ultimoPago: "2025-09-04",
  },
  {
    id: "c-004",
    nombre: "Roberto Gutierrez Paz",
    numeroCuenta: "0085-D",
    direccion: "Camino Real 23, Col. El Mirador",
    telefono: "5215599887766",
    saldoVencido: 540,
    mesesAdeudo: 2,
    ultimoPago: "2026-02-15",
  },
];

export const conveniosSeed: Convenio[] = [];
