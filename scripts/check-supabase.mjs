import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

dotenv.config({ path: resolve(projectRoot, '.env') });
dotenv.config({ path: resolve(projectRoot, '.env.local'), override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase URL or anon key. Current values:', {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? '[present]' : undefined,
  });
  console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are defined in .env or .env.local.');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

try {
  const { data, error, status } = await supabase.from('profiles').select('id').limit(1);

  if (error) {
    console.error('Failed to query Supabase.', { status, message: error.message });
    process.exit(1);
  }

  console.log('Supabase connection OK.');
  if (data && data.length > 0) {
    console.log('Sample profile id:', data[0].id);
  } else {
    console.log('No rows returned from profiles (table may be empty, but connection works).');
  }
} catch (err) {
  console.error('Unexpected error while checking Supabase connection.', err);
  process.exit(1);
}

