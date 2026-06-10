-- Cuentahabientes
create table if not exists public.cuentahabientes (
  id text primary key,
  nombre text not null,
  numero_cuenta text not null unique,
  direccion text,
  telefono text not null,
  email text,
  saldo_vencido numeric(12, 2) not null default 0,
  meses_adeudo integer not null default 0,
  ultimo_pago date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Convenios
create table if not exists public.convenios (
  id text primary key,
  folio text not null unique,
  cuentahabiente_id text not null references public.cuentahabientes(id) on delete cascade,
  fecha_creacion date not null,
  deuda_total numeric(12, 2) not null,
  enganche numeric(12, 2) not null default 0,
  numero_pagos integer not null,
  monto_pago numeric(12, 2) not null,
  periodicidad text not null check (periodicidad in ('semanal', 'quincenal', 'mensual')),
  fecha_primer_pago date not null,
  responsable text not null,
  observaciones text,
  estado text not null default 'activo' check (estado in ('activo', 'completado', 'cancelado')),
  archivado_en date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists convenios_cuentahabiente_id_idx on public.convenios(cuentahabiente_id);
create index if not exists convenios_estado_idx on public.convenios(estado);
create index if not exists convenios_folio_idx on public.convenios(folio);

-- Pagos de convenios
create table if not exists public.pagos (
  id text primary key,
  convenio_id text not null references public.convenios(id) on delete cascade,
  numero integer not null,
  fecha_programada date not null,
  monto numeric(12, 2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'vencido')),
  fecha_pago date,
  notas text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(convenio_id, numero)
);

create index if not exists pagos_convenio_id_idx on public.pagos(convenio_id);
create index if not exists pagos_fecha_programada_idx on public.pagos(fecha_programada);
create index if not exists pagos_estado_idx on public.pagos(estado);

-- Row Level Security (desactivado por ahora, pero listo para produccion)
alter table public.cuentahabientes enable row level security;
alter table public.convenios enable row level security;
alter table public.pagos enable row level security;

-- Permitir que usuarios autenticados lean y escriban (desarrollo; ajustar para produccion)
create policy "Allow all for authenticated users" on public.cuentahabientes
  for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.convenios
  for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated users" on public.pagos
  for all using (auth.role() = 'authenticated');
