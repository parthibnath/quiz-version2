type SupabaseAuthError = {
  code?: string;
  message?: string;
};

export function getSupabaseAuthErrorMessage(error: unknown) {
  const authError = error as SupabaseAuthError | null;

  if (
    authError?.code === "validation_failed" &&
    authError.message?.toLowerCase().includes("provider is not enabled")
  ) {
    return "Google sign-in is not enabled in Supabase. Enable Google under Authentication > Providers, then try again.";
  }

  if (authError?.message) return authError.message;
  if (error instanceof Error) return error.message;
  return "Supabase authentication failed. Please try again.";
}
