
'use client'

import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getRealDataItems, getRealActivityLogs, getNotifications, type EnrichedNotification } from '@/lib/data';
import type { User } from '@/lib/types';
import React from 'react';


function UserDashboardPage() {
    const searchParams = useSearchParams();
    const name = searchParams.get('name');

    // MOCK USER FOR PREVIEW
    const currentUser: User = {
        id: 'user-2',
        name: name || 'Maria Garcia',
        email: name ? `${name.split(' ').join('.').toLowerCase()}@example.com` : 'maria.g@example.com',
        avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user-2')}`,
        role: 'user',
        createdAt: '2024-07-21T11:30:00Z',
    };

    // In a real app with server components, this data fetching would be awaited.
    // Since this is a client component for the preview, we'll rely on the mock data inside the Dashboard.
    const userAssets = [];
    const userActivity = [];
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

const UserDashboardPageWrapper = () => (
    <React.Suspense fallback={<div>Loading...</div>}>
        <UserDashboardPage />
    </React.Suspense>
);

export default UserDashboardPageWrapper;
