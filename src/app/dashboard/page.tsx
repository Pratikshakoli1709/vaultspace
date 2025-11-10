
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getUsers, getDataItemsWithUploader, getActivityLogsWithUser, getNotifications, type EnrichedDataItem, type EnrichedActivityLog, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    redirect('/login');
  }

  // Fetch the user's profile from your 'profiles' table
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    // Handle cases where profile doesn't exist or there was an error
    // For now, we'll redirect to login, but you might want a better error page
    console.error('Error fetching profile:', profileError);
    redirect('/login?error=Could not fetch user profile.');
  }
  
  const currentUser: User = {
    id: userProfile.id,
    name: userProfile.full_name || 'No Name',
    email: authUser.email!,
    avatarUrl: userProfile.avatar_url || `https://i.pravatar.cc/150?u=${userProfile.id}`,
    role: userProfile.role || 'user',
    createdAt: userProfile.created_at,
  };


  // In a real app, this data would come from Supabase queries.
  // For now, we will continue to use mock data for these lists.
  const allUsers = await getUsers();
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
