"use client";

import { useStore } from "@/lib/store";
import { IconGota } from "./icons";

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const { loading, error, refresh } = useStore();

  if (error) {
    return (
      <div className="card mx-auto mt-16 max-w-lg p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-alerta-soft">
          <IconGota className="h-6 w-6 text-alerta" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-marino-900">
          No se pudo conectar
        </h2>
        <p className="mt-2 text-sm text-pizarra-soft">{error}</p>
        <p className="mt-2 text-xs text-pizarra-mute">
          Revisa las variables NEXT_PUBLIC_SUPABASE_URL y
          NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local o en Vercel.
        </p>
        <button onClick={() => refresh()} className="btn-primary mt-5">
          Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-32 flex flex-col items-center justify-center gap-3">
        <span className="relative grid h-12 w-12 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-aqua-400/30" />
          <IconGota className="h-6 w-6 text-aqua-500" />
        </span>
        <span className="text-sm text-pizarra-mute">Cargando datos…</span>
      </div>
    );
  }

  return <>{children}</>;
}
