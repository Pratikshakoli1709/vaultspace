
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getRealUsers, getRealDataItems, getRealActivityLogs, getNotifications, type EnrichedDataItem, type EnrichedActivityLog, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createClient();

  // Using a mock user as requested to bypass login for now.
  const currentUser: User = {
    id: 'user-1',
    name: 'Alex Johnson (Admin)',
    email: 'alex.j@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
    role: 'admin',
    createdAt: '2024-07-20T10:00:00Z',
  };

  const allUsers = await getRealUsers();
  const assets = await getRealDataItems();
  const activityLogs = await getRealActivityLogs();
  const notifications: EnrichedNotification[] = getNotifications();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser} />
        <SidebarInset>
          <Header user={currentUser} notifications={notifications} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Dashboard
              currentUser={currentUser}
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
