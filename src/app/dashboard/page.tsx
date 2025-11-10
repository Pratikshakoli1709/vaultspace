"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getCurrentUser, getUsers, getDataItemsWithUploader, getActivityLogsWithUser, getNotifications, EnrichedDataItem, EnrichedActivityLog, EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push('/login');
        return;
      }

      // We still use our mock data for roles and details
      const appUser = getCurrentUser(); 
      setUser(appUser);
      setSupabaseUser(data.user);
      setLoading(false);
    };

    checkUser();
  }, [router, supabase.auth]);
  

  if (loading || !user) {
    return (
      <div className="flex min-h-screen bg-background p-8">
        <div className="w-64 hidden md:block mr-8">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="flex-1 space-y-8">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // In a real app, this data would come from Supabase queries.
  const users = getUsers();
  const assets: EnrichedDataItem[] = getDataItemsWithUploader();
  const activityLogs: EnrichedActivityLog[] = getActivityLogsWithUser();
  const notifications: EnrichedNotification[] = getNotifications();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={user} />
        <SidebarInset>
          <Header user={user} notifications={notifications} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Dashboard
              currentUser={user}
              users={users}
              assets={assets}
              activityLogs={activityLogs}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
