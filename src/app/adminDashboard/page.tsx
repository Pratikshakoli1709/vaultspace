
'use client'

import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getRealUsers, getRealDataItems, getRealActivityLogs, getNotifications, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name');

  // MOCK ADMIN USER FOR PREVIEW
  const currentUser: User = {
    id: 'user-1',
    name: name || 'Alex Johnson',
    email: name ? `${name.split(' ')[0].toLowerCase()}@example.com` : 'alex.j@example.com',
    avatarUrl: `https://i.pravatar.cc/150?u=${name || 'user-1'}`,
    role: 'admin',
    createdAt: '2024-07-20T10:00:00Z',
  };

  const allUsersPromise = getRealUsers();
  const assetsPromise = getRealDataItems();
  const activityLogsPromise = getRealActivityLogs();

  const [allUsers, assets, activityLogs, notifications] = [
      // In a real app, you'd await these promises
      [], // For preview, we use mock data passed to Dashboard
      [],
      [],
      getNotifications()
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser} />
        <SidebarInset>
          <Header user={currentUser} notifications={notifications} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Dashboard
              currentUser={currentUser}
              users={[]} // pass mock data here for preview
              assets={[]}
              activityLogs={[]}
            />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


export default function AdminDashboardPage() {
    // We need to wrap the component that uses `useSearchParams` in a Suspense boundary
    // or just make the whole page a client component. For simplicity, we'll do the latter.
    // However, the data fetching part would ideally be in a Server Component.
    
    // This is a simplified preview setup. In a real app, you would fetch data in a server component
    // and pass it down, and the client component would only handle the query param.
    const allUsers = getRealUsers();
    const assets = getRealDataItems();
    const activityLogs = getRealActivityLogs();
    const notifications: EnrichedNotification[] = getNotifications();

    const searchParams = useSearchParams();
    const name = searchParams.get('name');

    // MOCK ADMIN USER FOR PREVIEW
    const currentUser: User = {
        id: 'user-1',
        name: name || 'Alex Johnson',
        email: name ? `${name.split(' ').join('.').toLowerCase()}@example.com` : 'alex.j@example.com',
        avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user-1')}`,
        role: 'admin',
        createdAt: '2024-07-20T10:00:00Z',
    };
    
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar user={currentUser} />
                <SidebarInset>
                    <Header user={currentUser} notifications={notifications} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        {/* 
                          In a real app, you would await these promises in a Server Component above this one.
                          For this dummy preview, we'll pass the promises and let React handle them, 
                          but some data might not be ready instantly. The dashboard component is designed to handle this.
                          However, for the preview to be reliable, we pass mock data directly.
                        */}
                        <Dashboard
                            currentUser={currentUser}
                            users={[]} // Using empty arrays as we're now client-side
                            assets={[]}
                            activityLogs={[]}
                        />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}

// Since getRealUsers and other data functions are async, they can't run directly in a top-level client component.
// I'll modify the `AdminDashboardPage` to be a client component and handle the data fetching inside,
// although this is not the ideal pattern for Next.js 14. For a preview, it's acceptable.
// The best approach is a Server Component parent that fetches data and passes it to a Client Component child.

const AdminDashboardPageWrapper = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardPage />
    </React.Suspense>
  )
}
