import 'server-only';

import { createClient } from '@supabase/supabase-js';

function getRequiredServerEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseServerClient() {
  const supabaseUrl = getRequiredServerEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
