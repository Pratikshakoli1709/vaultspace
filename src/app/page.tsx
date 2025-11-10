import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getCurrentUser, getUsers, getAssetsWithUploader, getActivityLogsWithUser } from '@/lib/data';

export default function Home() {
  // In a real app, user data would come from an auth session.
  const currentUser = getCurrentUser(); 
  const users = getUsers();
  const assets = getAssetsWithUploader();
  const activityLogs = getActivityLogsWithUser();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser} />
        <SidebarInset>
          <Header user={currentUser} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Dashboard
              currentUser={currentUser}
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
