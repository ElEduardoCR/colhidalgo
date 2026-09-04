-- ============================================================================
-- Foto completa de cada corte + deshacer la ultima importacion
--
-- Hasta ahora solo se guardaba el estado vigente del padron y el movimiento de
-- las cuentas que cambiaban. Eso dejaba dos huecos: no se podia reconstruir
-- como estaba el padron en un corte pasado, y una importacion equivocada no
-- tenia vuelta atras.
-- ============================================================================

-- ---- Foto de cada corte ----------------------------------------------------
create table if not exists public.corte_detalle (
  corte_id      text not null references public.cortes(id) on delete cascade,
  numero_cuenta text not null,
  id_usuario    integer,
  nombre        text,
  direccion     text,
  no_medidor    text,
  ruta          integer,
  secuencia     integer,
  ultimo_pago   date,
  tarifa        text,
  saldo_vencido numeric(12, 2) not null default 0,
  meses_adeudo  integer not null default 0,
  consumo       integer,
  primary key (corte_id, numero_cuenta)
);

create index if not exists corte_detalle_cuenta_idx
  on public.corte_detalle(numero_cuenta);

comment on table public.corte_detalle is
  'Todas las filas del archivo tal como se importaron. Permite reconstruir cualquier corte pasado y deshacer el mas reciente.';

-- ---- Deshacer la ultima importacion ----------------------------------------
-- Va como funcion para que las cinco operaciones ocurran en una sola
-- transaccion: o se revierte todo, o no se revierte nada.
create or replace function public.deshacer_corte(p_corte_id text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_fecha       date;
  v_previo      text;
  v_restauradas int := 0;
  v_eliminadas  int := 0;
  v_letras      int := 0;
  v_movs        int := 0;
begin
  select fecha_corte into v_fecha from public.cortes where id = p_corte_id;
  if v_fecha is null then
    raise exception 'El corte % no existe.', p_corte_id;
  end if;

  -- Solo se deshace el ultimo: revertir uno intermedio dejaria los saldos
  -- de los cortes posteriores sin sentido.
  if exists (
    select 1 from public.cortes
    where (fecha_corte, id) > (v_fecha, p_corte_id)
  ) then
    raise exception 'Solo se puede deshacer el corte mas reciente.';
  end if;

  select id into v_previo
    from public.cortes
   where id <> p_corte_id
   order by fecha_corte desc, id desc
   limit 1;

  if v_previo is null then
    raise exception 'No hay un corte anterior al que regresar.';
  end if;

  if not exists (select 1 from public.corte_detalle where corte_id = v_previo) then
    raise exception 'El corte anterior (%) no tiene foto guardada, no se puede restaurar.', v_previo;
  end if;

  -- 1. Devolver a pendiente las letras de convenio que acredito este corte.
  update public.pagos p
     set estado = 'pendiente', fecha_pago = null, updated_at = now()
    from public.movimientos m
   where m.corte_id = p_corte_id
     and m.pago_convenio_id = p.id;
  get diagnostics v_letras = row_count;

  -- 2. Borrar los pagos detectados por este corte.
  delete from public.movimientos where corte_id = p_corte_id;
  get diagnostics v_movs = row_count;

  -- 3. Regresar el padron a la foto del corte anterior.
  update public.cuentahabientes c
     set nombre        = d.nombre,
         direccion     = d.direccion,
         no_medidor    = d.no_medidor,
         ruta          = d.ruta,
         secuencia     = d.secuencia,
         ultimo_pago   = d.ultimo_pago,
         tarifa        = d.tarifa,
         saldo_vencido = d.saldo_vencido,
         meses_adeudo  = d.meses_adeudo,
         consumo       = d.consumo,
         fecha_corte   = (select fecha_corte from public.cortes where id = v_previo),
         updated_at    = now()
    from public.corte_detalle d
   where d.corte_id = v_previo
     and d.numero_cuenta = c.numero_cuenta;
  get diagnostics v_restauradas = row_count;

  -- 4. Quitar las cuentas que solo existian por este corte. Nunca se borra una
  --    que ya tenga convenio: primero hay que resolver el convenio a mano.
  delete from public.cuentahabientes c
   where c.numero_cuenta in (
           select numero_cuenta from public.corte_detalle where corte_id = p_corte_id
         )
     and c.numero_cuenta not in (
           select numero_cuenta from public.corte_detalle where corte_id = v_previo
         )
     and not exists (
           select 1 from public.convenios v where v.cuentahabiente_id = c.id
         );
  get diagnostics v_eliminadas = row_count;

  -- 5. Borrar el corte; su detalle se va en cascada.
  delete from public.cortes where id = p_corte_id;

  return jsonb_build_object(
    'corte_deshecho',       p_corte_id,
    'regreso_a',            v_previo,
    'cuentas_restauradas',  v_restauradas,
    'cuentas_eliminadas',   v_eliminadas,
    'letras_revertidas',    v_letras,
    'movimientos_borrados', v_movs
  );
end $$;

comment on function public.deshacer_corte(text) is
  'Revierte por completo la importacion mas reciente: letras de convenio, movimientos, padron y el propio corte.';

-- ---- Acceso ----------------------------------------------------------------
alter table public.corte_detalle enable row level security;

drop policy if exists "app_acceso_total" on public.corte_detalle;
create policy "app_acceso_total" on public.corte_detalle
  for all to anon, authenticated using (true) with check (true);

grant execute on function public.deshacer_corte(text) to anon, authenticated;
