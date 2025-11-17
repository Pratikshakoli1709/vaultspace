"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Logo } from "@/components/common/Logo"
import supabase from "@/lib/supabaseClient"

export default function SignupPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const normalizedAllowlist = useMemo(
      () => ['atharv@gmail.com', 'ankita@gmail.com'],
      [],
    );

    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)

        const normalizedEmail = email.trim().toLowerCase();
        const emailPattern =
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!emailPattern.test(normalizedEmail)) {
            toast({
                title: "Signup Failed",
                description: "Enter a valid email address.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        // Validate password length
        if (password.length < 6) {
            toast({
                title: "Signup Failed",
                description: "Password should be at least 6 characters.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name,
                email: normalizedEmail,
                password,
              }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              // If user already exists, try to log them in instead
              if (result.error?.includes('already been registered') || result.error?.includes('already exists')) {
                toast({
                  title: "Account Already Exists",
                  description: "This email is already registered. Attempting to log you in...",
                });
                
                // Try to sign in with the provided credentials
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                  email: normalizedEmail,
                  password,
                });

                if (signInError) {
                  throw new Error('This email is already registered. Please log in instead, or use a different email.');
                }

                // Fetch profile and redirect
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name, role')
                  .eq('id', signInData.user?.id ?? '')
                  .maybeSingle();

                const userName =
                  profileData?.full_name ||
                  signInData.user?.user_metadata?.full_name ||
                  signInData.user?.email ||
                  'User';
                const userRole = profileData?.role === 'admin' ? 'admin' : 'user';

                toast({
                  title: "Login Successful",
                  description: `Welcome back, ${userName}!`,
                });

                const redirectTarget = userRole === 'admin' ? '/adminDashboard' : '/userDashboard';

                setTimeout(() => {
                  router.push(redirectTarget);
                }, 1000);
                return;
              }
              
              throw new Error(result.error ?? 'Unable to create your account at the moment.');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });

            if (error) {
              throw error;
            }

            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('id', data.user?.id ?? '')
              .maybeSingle();

            const userName =
              profileData?.full_name ||
              data.user?.user_metadata?.full_name ||
              data.user?.email ||
              'User';
            const userRole = profileData?.role === 'admin' ? 'admin' : 'user';

            toast({
              title: "Signup Successful",
              description: `Welcome, ${userName}!`,
            });

            const redirectTarget = userRole === 'admin' ? '/adminDashboard' : '/userDashboard';

            setTimeout(() => {
              router.push(redirectTarget);
            }, 1000);
        } catch (error: any) {
            console.error('Signup error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            toast({
                title: "Signup Failed",
                description: error.message || "Failed to create account. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex items-center justify-center gap-2 mb-4">
                <Logo />
                <h1 className="text-3xl font-bold">VaultSpace</h1>
            </div>
            <h2 className="text-2xl font-bold">Create an account</h2>
            <p className="text-balance text-muted-foreground">
              Enter your information to get started.
            </p>
          </div>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                disabled={isLoading}
                placeholder="At least 6 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create an account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
       <div className="hidden bg-muted lg:block">
        <Image
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2072&auto=format&fit=crop"
          alt="A team of professionals collaborating in a modern workspace"
          data-ai-hint="corporate teamwork"
          width="1200"
          height="1800"
          className="h-full w-full object-cover dark:brightness-[0.3]"
        />
      </div>
    </div>
  )
}