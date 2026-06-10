-- Ajustes para datos reales del reporte de cortes (Junta Rural de Agua Potable Col. Hidalgo)
alter table public.cuentahabientes add column if not exists tarifa text;
alter table public.cuentahabientes alter column telefono drop not null;
