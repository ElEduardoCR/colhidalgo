# Col. Hidalgo — Junta Rural de Agua y Saneamiento

Aplicacion interna para el control de morosidad y los convenios de pago de la
Junta Rural de Agua y Saneamiento de Col. Hidalgo.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) — identidad de la Junta: azul marino,
  azul aqua y blanco
- [Supabase](https://supabase.com/) (Postgres) como base de datos

## Modulos

- **Resumen**: adeudo total del padron, cobertura bajo convenio, pagos del dia,
  pagos vencidos y mayores adeudos.
- **Morosidad**: el padron completo de cuentahabientes, con busqueda, filtros
  por tarifa, orden por adeudo/antiguedad/ruta y edicion. Ser moroso es un
  filtro por monto (umbral configurable desde la misma pantalla), no un alta o
  una baja.
- **Importar corte**: se sube el Excel semanal, se compara contra el corte
  anterior y se detectan los pagos. Nada se guarda hasta que se revisa.
- **Convenios**: alta con buscador de cuentahabiente (por nombre, numero de
  cuenta, domicilio o medidor, sin acentos y con varias palabras), listado con
  avance, detalle con calendario de pagos, reestructuracion y convenio oficial
  imprimible o exportable a PDF.
- **Calendario de pagos**: agenda por dia con accesos directos a WhatsApp y
  llamada telefonica.
- **Recordatorios**: avisos por WhatsApp un dia antes y el dia del pago.
- **Archivo y auditoria**: historico de convenios completados o cancelados.

## Actualizar el padron cada semana

El flujo ya no es dar de alta y baja cuentas: se sube el reporte de cortes en
**Importar corte** y la app concilia contra el corte anterior.

### Como se detecta un pago

Se usan dos senales del reporte:

1. **La fecha de ultimo pago avanzo.** Es la senal confiable: en la prueba con
   los cortes del 1 y el 4 de septiembre detecto los 93 pagos sin fallar uno.
2. **El saldo bajo.** Da el monto, pero solo por si sola cuando entre los dos
   cortes no se facturo.

El problema es la facturacion mensual: al cruzarla, el saldo de casi todos
**sube** aunque hayan pagado. Entre el corte del 24 de agosto y el del 1 de
septiembre eso le paso a 240 cuentas, y 11 de ellas si habian pagado. Por eso el
monto se calcula asi:

```
pago = saldo_anterior - saldo_nuevo + cargo_del_periodo
```

El `cargo_del_periodo` se estima por tarifa con la mediana de lo que subio a
quienes **no** pagaron. Si esa mediana es ~0, la app concluye que no hubo
facturacion y el monto pasa a ser una resta exacta.

Los montos estimados se marcan como tales y se pueden corregir en la pantalla
antes de aplicarlos. Un pago detectado por fecha pero sin baja de saldo llega en
cero y hay que capturarlo a mano.

### Convenios

Si la cuenta tiene convenio activo, la importacion propone acreditar el pago a
la siguiente letra pendiente y lo dice ("cubre la letra 3 de 6"). Se aplica solo
si se marca la casilla: nada se mueve solo en un documento firmado.

## Uso en iPad

La app esta pensada para usarse en iPad y se puede instalar en la pantalla de
inicio (Compartir > Anadir a pantalla de inicio). Se abre a pantalla completa,
sin la barra de Safari.

- La barra lateral aparece a partir de 1024 px (iPad horizontal). En vertical se
  colapsa en un menu para dejarle todo el ancho al contenido.
- Los campos usan 16 px en pantallas tactiles para que Safari no haga zoom al
  enfocarlos, y los botones respetan el minimo de 44 px de Apple.
- El icono y el manifest se generan con:

```bash
python3 scripts/generar_iconos.py
```

Escribe `src/app/icon.png` (favicon, solo la gota para que se lea a 16 px) y
`src/app/apple-icon.png` mas `public/icono-*.png` (gota + JRAS + Hidalgo), que
es lo que se ve en la pantalla de inicio.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

## Configuracion de Supabase

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=https://hjgfvwogvbvwrtjuwyzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Las mismas variables deben existir en Vercel > Project Settings > Environment
Variables. El cliente esta en `src/lib/supabase.ts` y se inicializa de forma
perezosa para que el build no falle si aun no hay variables.

## Base de datos

Las migraciones estan en `supabase/migrations/`, en orden cronologico:

| Archivo | Que hace |
| --- | --- |
| `20260610120000_init_schema.sql` | Tablas `cuentahabientes`, `convenios`, `pagos` |
| `20260610130000_add_tarifa_and_real_data.sql` | Columna `tarifa`, telefono opcional |
| `20260610140000_add_recordatorios.sql` | Preferencias de recordatorio |
| `20260824120000_esquema_reporte_cortes.sql` | Campos del reporte de cortes y politicas de acceso |
| `20260904120000_padron_completo_y_cortes.sql` | Padron completo, tablas `cortes` y `movimientos`, enganche con fecha, descuento y `configuracion` |

El esquema de `cuentahabientes` sigue las columnas del **reporte de cortes** que
emite el sistema de la Junta: `id_usuario`, `numero_cuenta`, `nombre`,
`direccion`, `no_medidor`, `ruta`, `secuencia`, `ultimo_pago`, `tarifa`,
`saldo_vencido`, `consumo` y `fecha_corte`. `meses_adeudo` se calcula como los
meses transcurridos entre el ultimo pago y la fecha de corte.

Tarifas del padron: `DSA`, `CSA`, `PAM`, `EAE`, `D1B`.

### Actualizar el padron cada mes

El padron se carga desde el Excel del reporte de cortes:

```bash
python3 scripts/generar_seed.py "/ruta/REZAGO AGOSTO 2026.xlsx"
```

Genera en `supabase/datos_privados/`:

- `datos_padron.sql` — solo los UPSERT del padron.
- `setup_completo.sql` — esquema desde cero + padron, para un proyecto nuevo.

Se pega el archivo en el editor SQL de Supabase y se ejecuta. El script es
idempotente: empata por numero de cuenta, actualiza saldo, consumo y ultimo pago,
y **no borra** los convenios ya capturados.

> `supabase/datos_privados/` esta en `.gitignore` a proposito: contiene nombres,
> domicilios y adeudos de los cuentahabientes y este repositorio es publico.

## Aviso de seguridad

La aplicacion todavia no tiene pantalla de acceso y consulta Supabase con la
llave anonima, que viaja en el navegador. Cualquiera que obtenga esa llave puede
leer y escribir el padron. Antes de publicarla fuera de la oficina conviene
agregar autenticacion y restringir las politicas de RLS.

## Estructura

```
src/
  app/                 paginas (App Router)
  components/          UI compartida (sidebar, header, stats, iconos)
  lib/                 store, tipos, helpers de formato, cliente Supabase
scripts/
  generar_seed.py      Excel del reporte de cortes -> SQL para Supabase
  generar_iconos.py    iconos de la app (favicon e icono de pantalla de inicio)
supabase/
  migrations/          migraciones versionadas
```
