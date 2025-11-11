import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getRealDataItems, getRealActivityLogs, getNotifications, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';

export default async function UserDashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return redirect('/login?error=Profile not found. Please log in again.');
  }

  const currentUser: User = {
    id: user.id,
    name: profile.full_name || 'User',
    email: user.email || 'No email',
    avatarUrl: profile.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`,
    role: profile.role || 'user',
    createdAt: user.created_at,
  };

  // For a regular user, we only need their assets and activities
  const allAssets = await getRealDataItems();
  const userAssets = allAssets.filter(asset => asset.created_by === currentUser.id);

  const allActivityLogs = await getRealActivityLogs();
  const userActivity = allActivityLogs.filter(log => log.user_id === currentUser.id);
  
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
              users={[]} // Regular user doesn't need the full user list
              assets={userAssets}
              activityLogs={userActivity}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
