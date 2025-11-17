/**
 * Creates a Supabase user with email already confirmed and seeds the profile.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY server environment variable.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ADMIN_ALLOWLIST = new Set(['atharv@gmail.com', 'ankita@gmail.com']);

interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegisterPayload;
    const name = (payload.name ?? '').trim();
    const email = (payload.email ?? '').trim().toLowerCase();
    const password = payload.password ?? '';

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid email address.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password should be at least 6 characters long.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (error) {
      console.error('Supabase admin createUser error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to create user: ${error.message ?? 'Database error creating new user'}` },
        { status: 400 },
      );
    }

    const user = data?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Supabase did not return a user object.' },
        { status: 500 },
      );
    }

    const role = ADMIN_ALLOWLIST.has(email) ? 'admin' : 'user';

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email,
          full_name: name || null,
          avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
          role,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return NextResponse.json(
        { success: false, error: `Failed to create profile: ${profileError.message ?? 'Database error creating profile'}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('Failed to register user via service role', error);
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return NextResponse.json(
      { success: false, error: `Failed to create user: ${message}` },
      { status: 500 },
    );
  }
}
