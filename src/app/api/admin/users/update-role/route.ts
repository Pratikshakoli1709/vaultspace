/**
 * Admin-only endpoint to update a user's role.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL env variable.');
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY env variable.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ADMIN_ALLOWLIST = new Set(['atharv@gmail.com', 'ankita@gmail.com']);

type AcceptedRole = 'admin' | 'user';

interface UpdateRolePayload {
  actorId?: string;
  userId?: string;
  role?: AcceptedRole;
}

const buildError = (status: number, message: string) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UpdateRolePayload;
    const actorId = payload.actorId?.trim();
    const userId = payload.userId?.trim();
    const role = payload.role;

    if (!actorId || !userId || (role !== 'admin' && role !== 'user')) {
      return buildError(400, 'Invalid request payload.');
    }

    const { data: actorProfile, error: actorError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', actorId)
      .maybeSingle();

    if (actorError) {
      return buildError(500, actorError.message ?? 'Failed to verify actor.');
    }

    if (!actorProfile) {
      return buildError(403, 'Actor profile not found.');
    }

    const normalizedEmail = (actorProfile.email ?? '').toLowerCase();
    const isAllowlisted = ADMIN_ALLOWLIST.has(normalizedEmail);
    const isAdmin = actorProfile.role === 'admin';

    if (!isAllowlisted && !isAdmin) {
      return buildError(403, 'You are not authorized to change roles.');
    }

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select('id, full_name, email, avatar_url, role, created_at')
      .maybeSingle();

    if (updateError) {
      return buildError(500, updateError.message ?? 'Failed to update role.');
    }

    if (!updatedProfile) {
      return buildError(404, 'Target user not found.');
    }

    return NextResponse.json({ success: true, user: updatedProfile });
  } catch (error) {
    console.error('Failed to update user role via service role', error);
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return buildError(500, message);
  }
}
