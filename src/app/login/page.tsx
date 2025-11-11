"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Logo } from "@/components/common/Logo"

export default function LoginPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        
        const welcomeMessage = email === 'Pratiksha Koli' ? `Welcome, Pratiksha Koli!` : "Welcome to your dashboard!";
        
        toast({
            title: "Login Successful",
            description: welcomeMessage,
        })

        // Use a short timeout to allow the user to see the toast before redirecting
        setTimeout(() => {
            if (email === 'Pratiksha Koli') {
                router.push('/adminDashboard');
            } else {
                router.push('/userDashboard');
            }
        }, 1000);
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
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-balance text-muted-foreground">
              Enter your credentials to access your secure vault.
            </p>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
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
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
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
