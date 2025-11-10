import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.headers.get('Cookie')?.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`)?.[2]
          },
          set(name: string, value: string, options: CookieOptions) {
            // If the cookie is set, update the headers
            const response = NextResponse.redirect(`${origin}${next}`)
            response.cookies.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            // If the cookie is removed, update the headers
            const response = NextResponse.redirect(`${origin}${next}`)
            response.cookies.set(name, '', options)
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
