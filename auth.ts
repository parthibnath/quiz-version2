import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export async function auth() {
  if (!hasSupabasePublicConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const email = data.user.email ?? null;
  return {
    user: {
      id: data.user.id,
      email,
      name: data.user.user_metadata.full_name ?? data.user.user_metadata.name ?? null,
    },
  };
}
