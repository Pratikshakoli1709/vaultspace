import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/adminDashboard', '/userDashboard', '/settings', '/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow auth pages without protection
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next();
  }

  const requiresAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!requiresAuth) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookies (Supabase stores cookies with pattern sb-<project-ref>-auth-token)
  // The Supabase JS client automatically manages cookies, so we check for any cookie containing 'sb-' or 'auth'
  const hasAuthCookie = Array.from(request.cookies.getAll()).some(
    (cookie) => cookie.name.includes('sb-') || cookie.name.includes('auth')
  );

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Note: Full session validation happens client-side via SupabaseProvider
  // This middleware just checks for the presence of auth cookies as a first line of defense
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/adminDashboard/:path*',
    '/userDashboard/:path*',
    '/dashboard/:path*',
    '/settings/:path*',
  ],
};

