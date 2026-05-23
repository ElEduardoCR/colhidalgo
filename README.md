# Colhidalgo - Junta Rural de Agua y Saneamiento

Aplicacion para el registro de morosidad y la generacion de convenios de pago.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) (paleta blanco/negro estilo Apple)
- [Supabase](https://supabase.com/) (cliente listo, configuracion de BD pendiente)
- Almacenamiento temporal: `localStorage` mientras se conecta Supabase.

## Modulos

- **Resumen**: panel con adeudo total, convenios activos, pagos del dia y pagos vencidos.
- **Morosidad**: alta/edicion/baja de cuentahabientes con saldo vencido.
- **Convenios**: creacion, listado, detalle con calendario de pagos, reestructuracion, marcado de pagos y documento oficial imprimible/exportable a PDF.
- **Calendario de pagos**: agenda diaria/semanal con accesos directos a WhatsApp y llamada telefonica.
- **Archivo y auditoria**: historico de convenios completados o cancelados.

## Scripts

```bash
npm install
npm run dev      # arranca el servidor local en http://localhost:3000
npm run build
npm run start
```

## Configuracion de Supabase

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

El cliente esta en `src/lib/supabase.ts` y se inicializa de forma perezosa. Mientras no haya variables, la app funciona con el store local.

## Estructura

```
src/
  app/                 paginas (App Router)
  components/          UI compartida (sidebar, header, stats)
  lib/                 store, tipos, helpers de formato, cliente Supabase
```
