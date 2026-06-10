import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Configuralas en .env.local (local) y en Vercel > Project Settings > Environment Variables.",
    );
  }
  _client = createClient(url, anonKey);
  return _client;
}

/**
 * Cliente de Supabase con inicializacion perezosa: solo se crea al primer uso
 * real (p. ej. supabase.from(...)), no al importar el modulo. Esto evita que el
 * build de Next.js falle si las variables de entorno aun no estan presentes.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
