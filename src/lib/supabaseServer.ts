import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client for API routes
 * Uses service role key to bypass RLS (we validate permissions in API routes)
 * 
 * IMPORTANT: Only use this in API routes, never expose to client-side
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If service role key is available, use it (bypasses RLS)
  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Fallback to anon key (will respect RLS)
  // This is less ideal but works if service role key is not set
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || !supabaseUrl) {
    throw new Error('Missing Supabase environment variables. Need NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, anonKey);
}

// Export a singleton instance (lazy initialization to handle missing env vars gracefully)
let _supabaseServer: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
  if (!_supabaseServer) {
    try {
      _supabaseServer = createServerClient();
    } catch (error) {
      console.error('Failed to initialize Supabase server client:', error);
      throw error;
    }
  }
  return _supabaseServer;
}

// Export for backward compatibility - initialize lazily
// This will throw if env vars are missing, but that's okay - it should be caught in API routes
export const supabaseServer = getSupabaseServer();

