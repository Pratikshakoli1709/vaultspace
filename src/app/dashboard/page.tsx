"use client"

import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getUsers, getDataItemsWithUploader, getActivityLogsWithUser, getNotifications, type EnrichedDataItem, type EnrichedActivityLog, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export default function DashboardPage() {
  // NOTE: The authentication flow has been temporarily disabled to allow for a preview of the dashboard.
  // A mock admin user is being used.
  const [user] = useState<User>({
    id: 'user-1',
    name: 'Admin Preview',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
    avatarUrl: `https://i.pravatar.cc/150?u=admin-preview`
  });
  
  // In a real app, this data would come from Supabase queries.
  const allUsers = getUsers();
  const assets: EnrichedDataItem[] = getDataItemsWithUploader();
  const activityLogs: EnrichedActivityLog[] = getActivityLogsWithUser();
  const notifications: EnrichedNotification[] = getNotifications();

  if (!user) {
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


  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={user} />
        <SidebarInset>
          <Header user={user} notifications={notifications} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Dashboard
              currentUser={user}
              users={allUsers}
              assets={assets}
              activityLogs={activityLogs}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
