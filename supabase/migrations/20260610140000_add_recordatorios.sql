-- Preferencias de recordatorio por convenio (recordar via WhatsApp)
alter table public.convenios
  add column if not exists recordar_dia_antes boolean not null default true;
alter table public.convenios
  add column if not exists recordar_dia_de_pago boolean not null default true;
