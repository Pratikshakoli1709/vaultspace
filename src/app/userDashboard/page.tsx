
'use client'

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getNotifications, type EnrichedNotification, type EnrichedDataItem } from '@/lib/data';
import type { User, DataItem } from '@/lib/types';
import { getMockDataItems, getMockActivityLogs, getMockUsers } from '@/lib/mock-data';


function UserDashboardPageContent() {
    const searchParams = useSearchParams();
    const name = searchParams.get('name');

    const [currentUser, setCurrentUser] = React.useState<User>({
        id: 'user-2',
        name: name || 'Maria Garcia',
        email: name ? `${name.split(' ').join('.').toLowerCase()}@example.com` : 'maria.g@example.com',
        avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user-2')}`,
        role: 'user',
        createdAt: '2024-07-21T11:30:00Z',
    });

    const allUsers = getMockUsers();
    const [userAssets, setUserAssets] = React.useState<EnrichedDataItem[]>(
        getMockDataItems()
            .filter(asset => asset.created_by === currentUser.id)
            .map(asset => ({...asset, uploader: allUsers.find(u => u.id === asset.created_by)}))
    );
    const [userActivity, setUserActivity] = React.useState(
        getMockActivityLogs()
            .filter(log => log.user_id === currentUser.id)
            .map(log => ({...log, user: allUsers.find(u => u.id === log.user_id)}))
    );
    const notifications: EnrichedNotification[] = getNotifications();

    const handleAssetUpload = (newAsset: DataItem) => {
        const enrichedAsset: EnrichedDataItem = {
          ...newAsset,
          uploader: allUsers.find(u => u.id === newAsset.created_by)
        }
        setUserAssets(prevAssets => [enrichedAsset, ...prevAssets]);
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar user={currentUser} />
                <SidebarInset>
                    <Header user={currentUser} notifications={notifications} onAssetUpload={handleAssetUpload} onUserUpdate={setCurrentUser} />
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

export default function UserDashboardPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <UserDashboardPageContent />
        </React.Suspense>
    );
}
