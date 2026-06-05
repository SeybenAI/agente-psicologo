import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;

/**
 * Devuelve el usuario autenticado y su perfil, o null si no hay sesión.
 * Para usar en Server Components, Server Actions y Route Handlers.
 */
export async function getSessionProfile(): Promise<{
  user: { id: string; email?: string };
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { user: { id: user.id, email: user.email }, profile };
}
