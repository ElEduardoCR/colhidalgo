-- ============================================================================
-- Padron completo + conciliacion por cortes
--
-- Cambia el modelo: en vez de dar de alta y baja cuentas segun entren o salgan
-- de morosidad, se guarda el padron completo y la morosidad pasa a ser un
-- filtro por monto. Cada archivo del "reporte de cortes" que se importa queda
-- registrado y su comparacion contra el corte anterior genera los pagos
-- detectados.
-- ============================================================================

-- ---- Padron completo -------------------------------------------------------
alter table public.cuentahabientes
  add column if not exists activo boolean not null default true;

comment on column public.cuentahabientes.activo is
  'false cuando la cuenta dejo de aparecer en el padron (baja del servicio).';
comment on column public.cuentahabientes.saldo_vencido is
  'Adeudo del ultimo corte importado. Ser moroso depende del umbral configurado, no de estar o no en esta tabla.';

-- ---- Cortes importados -----------------------------------------------------
create table if not exists public.cortes (
  id            text primary key,
  fecha_corte   date not null,
  archivo       text,
  total_cuentas integer not null default 0,
  total_adeudo  numeric(14, 2) not null default 0,
  altas         integer not null default 0,
  pagos_detectados integer not null default 0,
  monto_detectado  numeric(14, 2) not null default 0,
  notas         text,
  importado_en  timestamp with time zone default now()
);

create index if not exists cortes_fecha_idx on public.cortes(fecha_corte desc);

comment on table public.cortes is
  'Cada archivo de reporte de cortes importado. El mas reciente es el estado vigente del padron.';

-- ---- Movimientos: pagos detectados al comparar dos cortes ------------------
create table if not exists public.movimientos (
  id                text primary key,
  corte_id          text not null references public.cortes(id) on delete cascade,
  cuentahabiente_id text not null references public.cuentahabientes(id) on delete cascade,
  fecha_pago        date,
  saldo_anterior    numeric(12, 2) not null default 0,
  saldo_nuevo       numeric(12, 2) not null default 0,
  -- Cargo del periodo estimado con la mediana de los que NO pagaron, por
  -- tarifa. Sin el, un pago menor al recibo del mes queda invisible.
  cargo_estimado    numeric(12, 2) not null default 0,
  monto_detectado   numeric(12, 2) not null default 0,
  monto_confirmado  numeric(12, 2),
  -- 'fecha'  la fecha de ultimo pago avanzo
  -- 'saldo'  solo bajo el saldo
  -- 'ambos'  las dos senales coinciden (el caso confiable)
  origen            text not null default 'ambos'
                    check (origen in ('fecha', 'saldo', 'ambos')),
  estado            text not null default 'propuesto'
                    check (estado in ('propuesto', 'confirmado', 'descartado')),
  -- Letra del convenio a la que se acredito, si aplica.
  pago_convenio_id  text references public.pagos(id) on delete set null,
  notas             text,
  created_at        timestamp with time zone default now(),
  updated_at        timestamp with time zone default now()
);

create index if not exists movimientos_corte_idx on public.movimientos(corte_id);
create index if not exists movimientos_cuenta_idx on public.movimientos(cuentahabiente_id);
create index if not exists movimientos_estado_idx on public.movimientos(estado);
create unique index if not exists movimientos_corte_cuenta_idx
  on public.movimientos(corte_id, cuentahabiente_id);

comment on column public.movimientos.monto_detectado is
  'Estimacion: (saldo_anterior - saldo_nuevo) + cargo_estimado. Se confirma o corrige antes de aplicarse.';
comment on column public.movimientos.monto_confirmado is
  'Monto que valido el encargado. Nulo mientras el movimiento siga propuesto.';

-- ---- Convenios: enganche con fecha propia y descuento ----------------------
alter table public.convenios
  add column if not exists fecha_enganche  date,
  add column if not exists descuento_tipo  text,
  add column if not exists descuento_valor numeric(12, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'convenios_descuento_tipo_check'
  ) then
    alter table public.convenios
      add constraint convenios_descuento_tipo_check
      check (descuento_tipo is null or descuento_tipo in ('monto', 'porcentaje'));
  end if;
end $$;

comment on column public.convenios.fecha_enganche is
  'Fecha en que se paga el enganche, que puede ser distinta a la de firma. El calendario de pagos corre a partir de ella.';
comment on column public.convenios.descuento_tipo is
  'monto = descuento en pesos; porcentaje = sobre la deuda. Nulo si no hay descuento.';

-- ---- Configuracion de la app ----------------------------------------------
create table if not exists public.configuracion (
  clave      text primary key,
  valor      text not null,
  updated_at timestamp with time zone default now()
);

insert into public.configuracion (clave, valor)
values ('umbral_morosidad', '500')
on conflict (clave) do nothing;

comment on table public.configuracion is
  'Ajustes editables desde la app. umbral_morosidad: adeudo minimo en MXN para considerar morosa una cuenta.';

-- ---- Acceso desde la app (mismas politicas que el resto) -------------------
alter table public.cortes        enable row level security;
alter table public.movimientos   enable row level security;
alter table public.configuracion enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cortes', 'movimientos', 'configuracion'] loop
    execute format('drop policy if exists "app_acceso_total" on public.%I', t);
    execute format(
      'create policy "app_acceso_total" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
