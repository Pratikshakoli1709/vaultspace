'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/SupabaseProvider';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useSupabase();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // If user is logged in, redirect to their dashboard
        const dashboardPath = user.role === 'admin' ? '/adminDashboard' : '/userDashboard';
        router.push(dashboardPath);
      } else {
        // If user is not logged in, redirect to login
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
