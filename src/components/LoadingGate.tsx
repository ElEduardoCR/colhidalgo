"use client";

import { useStore } from "@/lib/store";

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const { loading, error, refresh } = useStore();

  if (error) {
    return (
      <div className="card p-8 max-w-lg mx-auto mt-16 text-center">
        <h2 className="text-lg font-semibold">No se pudo conectar</h2>
        <p className="mt-2 text-sm text-ink-soft">{error}</p>
        <p className="mt-1 text-xs text-ink-mute">
          Revisa las variables NEXT_PUBLIC_SUPABASE_URL y
          NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.
        </p>
        <button onClick={() => refresh()} className="btn-primary mt-5">
          Reintentar
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-32 text-sm text-ink-mute">
        <span className="h-2 w-2 rounded-full bg-ink animate-pulse mr-2" />
        Cargando datos…
      </div>
    );
  }

  return <>{children}</>;
}
