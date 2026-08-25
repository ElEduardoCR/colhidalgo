-- ============================================================================
-- Esquema alineado al "Reporte de cortes" de la Junta Rural de Agua y Saneamiento
-- de Col. Hidalgo (padron de rezago). Agrega los campos que trae el reporte:
-- id de usuario, medidor, ruta, secuencia, consumo y fecha de corte.
-- ============================================================================

-- ---- Cuentahabientes: campos del padron -----------------------------------
alter table public.cuentahabientes
  add column if not exists id_usuario   integer,
  add column if not exists no_medidor   text,
  add column if not exists ruta         integer,
  add column if not exists secuencia    integer,
  add column if not exists consumo      integer,
  add column if not exists observaciones text,
  add column if not exists fecha_corte  date;

-- El padron no incluye telefono ni correo: deben quedar opcionales.
alter table public.cuentahabientes alter column telefono drop not null;

comment on column public.cuentahabientes.id_usuario is
  'IdUsuario del sistema de la Junta (columna IdUsuario del reporte de cortes).';
comment on column public.cuentahabientes.no_medidor is
  'Numero de medidor. Puede ser nulo: hay tomas sin medidor instalado.';
comment on column public.cuentahabientes.ruta is
  'Ruta de lectura/reparto.';
comment on column public.cuentahabientes.secuencia is
  'Secuencia dentro de la ruta (columna "Sec." del reporte).';
comment on column public.cuentahabientes.consumo is
  'Consumo del periodo en m3 reportado en el corte.';
comment on column public.cuentahabientes.fecha_corte is
  'Fecha del reporte de cortes del que provienen saldo, consumo y ultimo pago.';
comment on column public.cuentahabientes.meses_adeudo is
  'Meses transcurridos desde el ultimo pago a la fecha de corte.';

create unique index if not exists cuentahabientes_id_usuario_idx
  on public.cuentahabientes(id_usuario)
  where id_usuario is not null;
create index if not exists cuentahabientes_saldo_vencido_idx
  on public.cuentahabientes(saldo_vencido desc);
create index if not exists cuentahabientes_ruta_secuencia_idx
  on public.cuentahabientes(ruta, secuencia);
create index if not exists cuentahabientes_nombre_idx
  on public.cuentahabientes(nombre);

-- ---- Acceso desde la app ---------------------------------------------------
-- La aplicacion es interna y consulta Supabase con la llave anonima, sin login.
-- Las politicas originales solo permitian el rol 'authenticated', por lo que la
-- app no podia leer ni escribir. Se abren tambien para 'anon'.
-- OJO: mientras no exista una pantalla de acceso, cualquiera que obtenga la
-- llave anonima (viaja en el navegador) puede leer y escribir estos datos.
do $$
declare t text;
begin
  foreach t in array array['cuentahabientes', 'convenios', 'pagos'] loop
    execute format('drop policy if exists "Allow all for authenticated users" on public.%I', t);
    execute format('drop policy if exists "app_acceso_total" on public.%I', t);
    execute format(
      'create policy "app_acceso_total" on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
