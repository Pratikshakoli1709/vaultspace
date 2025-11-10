
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getUsers, getDataItemsWithUploader, getActivityLogsWithUser, getNotifications, type EnrichedDataItem, type EnrichedActivityLog, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    redirect('/login');
  }

  // At this point, we have an authenticated user.
  // We can use their info. In a real app, you'd fetch profile from your own 'users' table.
  // For now, we'll construct a user object from the auth data.
  // We will temporarily give the user an 'admin' role to see all features.
  const currentUser: User = {
    id: authUser.id,
    name: authUser.user_metadata.full_name || authUser.email || 'User',
    email: authUser.email || '',
    role: 'admin', // TEMPORARY: Hardcoded for preview
    createdAt: authUser.created_at,
    avatarUrl: authUser.user_metadata.avatar_url || `https://i.pravatar.cc/150?u=${authUser.id}`,
  }

  // In a real app, this data would come from Supabase queries.
  const allUsers = getUsers();
  const assets: EnrichedDataItem[] = getDataItemsWithUploader();
  const activityLogs: EnrichedActivityLog[] = getActivityLogsWithUser();
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
