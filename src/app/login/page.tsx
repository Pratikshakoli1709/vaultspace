"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Logo } from "@/components/common/Logo"
import supabase from "@/lib/supabaseClient"

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams();
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const normalizedAllowlist = useMemo(
      () => ['atharv@gmail.com', 'ankita@gmail.com'],
      [],
    );

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        const normalizedEmailInput = email.trim().toLowerCase();
        if (!normalizedEmailInput) {
            toast({
                title: "Login Failed",
                description: "Please enter a valid email.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        try {
            // Sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmailInput,
                password,
            })

            if (error) {
                console.error('Supabase login error:', error);
                // Provide more specific error messages
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please check your credentials and try again.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
                } else {
                    throw error;
                }
            }

            if (!data.user) {
                throw new Error('Login failed. No user data returned.');
            }

            // Fetch user role from profiles table with error handling
            try {
                const normalizedEmail = (data.user?.email || '').toLowerCase();

                let { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', data.user?.id)
                    .maybeSingle();

                // If profile doesn't exist, create it
                if (profileError || !profileData) {
                  console.log('Profile not found, creating one...', profileError);
                  const role = normalizedAllowlist.includes(normalizedEmail) ? 'admin' : 'user';
                  const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert(
                      {
                        id: data.user.id,
                        email: normalizedEmail,
                        full_name: data.user.user_metadata?.full_name || null,
                        avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizedEmail)}`,
                        role,
                      },
                      { onConflict: 'id' },
                    );

                  if (upsertError) {
                    console.error('Failed to create profile:', upsertError);
                  } else {
                    // Fetch the newly created profile
                    const { data: newProfileData } = await supabase
                      .from('profiles')
                      .select('full_name, role')
                      .eq('id', data.user?.id)
                      .maybeSingle();
                    profileData = newProfileData;
                  }
                }

                let userRole = profileData?.role ?? 'user';

                if (profileData?.role === 'admin') {
                  userRole = 'admin';
                } else if (normalizedAllowlist.includes(normalizedEmail)) {
                  userRole = 'admin';
                }

                const userName =
                  profileData?.full_name ||
                  data.user?.user_metadata?.full_name ||
                  data.user?.email ||
                  'User';
                
                console.log('Login successful - User role:', userRole, 'Email:', normalizedEmail);
                
                toast({
                    title: "Login Successful",
                    description: `Welcome, ${userName}!`,
                })
                
                const redirectTarget =
                  searchParams.get('redirectTo') ||
                  (userRole === 'admin' ? '/adminDashboard' : '/userDashboard');

                console.log('Redirecting to:', redirectTarget);
                
                // Wait a bit for session to be fully established
                await new Promise((resolve) => setTimeout(resolve, 500));
                
                router.push(redirectTarget);
            } catch (profileFetchError) {
                console.error('Profile fetch error:', profileFetchError);
                // Fallback to user role if profile fetch fails
                const normalizedEmail = (data.user?.email || '').toLowerCase();
                const userRole = normalizedAllowlist.includes(normalizedEmail) ? 'admin' : 'user';
                const userName = data.user?.email || 'User';
                
                console.log('Login successful (fallback) - User role:', userRole, 'Email:', normalizedEmail);
                
                toast({
                    title: "Login Successful",
                    description: `Welcome, ${userName}!`,
                })
                
                const redirectTarget =
                  searchParams.get('redirectTo') ||
                  (userRole === 'admin' ? '/adminDashboard' : '/userDashboard');

                console.log('Redirecting to:', redirectTarget);
                
                // Wait a bit for session to be fully established
                await new Promise((resolve) => setTimeout(resolve, 500));
                
                router.push(redirectTarget);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Invalid credentials. Please try again.";
            console.error('Login error:', error);
            console.error('Error details:', {
                message: errorMessage,
                name: error instanceof Error ? error.name : 'Unknown',
            });
            
            toast({
                title: "Login Failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleLogin} className="grid gap-3 sm:gap-4">
            <div className="grid gap-1.5 sm:gap-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="text-sm sm:text-base h-9 sm:h-10" />
            </div>
            <div className="grid gap-1.5 sm:gap-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-xs sm:text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="text-sm sm:text-base h-9 sm:h-10" />
            </div>
            <Button type="submit" className="w-full h-9 sm:h-10 text-sm sm:text-base" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
    );
}

function LoginFormFallback() {
    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" disabled />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline"
                    >
                        Forgot your password?
                    </Link>
                </div>
                <Input id="password" type="password" disabled />
            </div>
            <Button type="submit" className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
            </Button>
        </div>
    );
}

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
        <div className="mx-auto grid w-full max-w-full sm:max-w-[350px] gap-4 sm:gap-6 px-2 sm:px-0">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                <Logo />
                <h1 className="text-2xl sm:text-3xl font-bold">VaultSpace</h1>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Welcome Back</h2>
            <p className="text-sm sm:text-base text-balance text-muted-foreground">
              Enter your credentials to access your secure vault.
            </p>
          </div>
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
          <div className="mt-4 text-center text-xs sm:text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1974&auto=format&fit=crop"
          alt="Two colleagues collaborating in a modern office"
          data-ai-hint="corporate collaboration"
          width="1200"
          height="1800"
          className="h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
    </div>
  )
}