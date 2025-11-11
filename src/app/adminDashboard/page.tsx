
'use client'

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import type { EnrichedNotification, EnrichedDataItem } from '@/lib/data';
import { getNotifications } from '@/lib/data';
import type { User, DataItem } from '@/lib/types';
import { getMockUsers, getMockDataItems, getMockActivityLogs } from '@/lib/mock-data';

function AdminDashboardPageContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name');

  const [currentUser, setCurrentUser] = React.useState<User>({
      id: 'user-1',
      name: name || 'Alex Johnson',
      email: name ? `${name.split(' ').join('.').toLowerCase()}@example.com` : 'alex.j@example.com',
      avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(name || 'user-1')}`,
      role: 'admin',
      createdAt: '2024-07-20T10:00:00Z',
  });
  
  const allUsers = getMockUsers();
  const [assets, setAssets] = React.useState<EnrichedDataItem[]>(
    getMockDataItems().map(asset => ({
      ...asset,
      uploader: allUsers.find(u => u.id === asset.created_by)
    }))
  );
  const [activityLogs, setActivityLogs] = React.useState(getMockActivityLogs().map(log => ({...log, user: allUsers.find(u => u.id === log.user_id)})));
  const notifications: EnrichedNotification[] = getNotifications();

  const handleAssetUpload = (newAsset: DataItem) => {
    const enrichedAsset: EnrichedDataItem = {
      ...newAsset,
      uploader: allUsers.find(u => u.id === newAsset.created_by)
    }
    setAssets(prevAssets => [enrichedAsset, ...prevAssets]);
    // Optionally, add to activity log state as well
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


export default function AdminDashboardPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardPageContent />
    </React.Suspense>
  );
}
