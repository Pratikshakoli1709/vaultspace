
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getRealDataItems, getRealActivityLogs, getNotifications, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function UserDashboardPage() {
    // MOCK USER FOR PREVIEW
    const currentUser: User = {
        id: 'user-2',
        name: 'Maria Garcia',
        email: 'maria.g@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
        role: 'user',
        createdAt: '2024-07-21T11:30:00Z',
    };

    const userAssets = (await getRealDataItems()).filter(item => item.created_by === currentUser.id);
    const userActivity = (await getRealActivityLogs()).filter(log => log.user_id === currentUser.id);
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
                            users={[]} 
                            assets={userAssets}
                            activityLogs={userActivity}
                        />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
