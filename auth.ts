import { connection } from "next/server";
import { cache } from "react";
import { ApiError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export const auth = cache(async () => {
  await connection();
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
});

export async function requireUser() {
  const session = await auth();
  if (!session) throw new ApiError(401, "Log in to continue.");
  return session.user;
}
