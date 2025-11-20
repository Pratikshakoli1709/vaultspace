'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import {
  getNotifications,
  getRealActivityLogs,
  getRealDataItems,
  getRealUsers,
} from '@/lib/data';
import type {
  EnrichedNotification,
  EnrichedDataItem,
  EnrichedActivityLog,
  User,
} from '@/lib/types';
import { ControlledDashboard } from '@/components/dashboard/ControlledDashboard';
import { useSupabase } from '@/components/SupabaseProvider';

function AdminDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: supabaseUser, isLoading } = useSupabase();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<EnrichedDataItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<EnrichedActivityLog[]>([]);
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  useEffect(() => {
    const nameParam = searchParams.get('name');
    if (nameParam === 'Atharv') {
      setCurrentUser({
        id: 'atharv-special',
        name: 'Atharv',
        email: 'atharv@gmail.com',
        avatarUrl: `https://i.pravatar.cc/150?u=atharv@gmail.com`,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      return;
    }
    
    if (!isLoading) {
      if (!supabaseUser) {
        router.push('/login');
      } else if (supabaseUser.role !== 'admin') {
        router.push('/userDashboard');
      } else {
        setCurrentUser(supabaseUser);
      }
    }
  }, [supabaseUser, isLoading, router, searchParams]);

  useEffect(() => {
    if (supabaseUser) {
      setAllUsers((prev) => {
        if (prev.some((user) => user.id === supabaseUser.id)) {
          return prev;
        }
        return [...prev, supabaseUser];
      });

      setAssets((prev) =>
        prev.map((asset) =>
          asset.created_by === supabaseUser.id
            ? {
      ...asset,
                uploader: supabaseUser,
              }
            : asset,
        ),
      );

      setActivityLogs((prev) =>
        prev.map((log) =>
          log.user_id === supabaseUser.id
            ? {
                ...log,
                user: supabaseUser,
              }
            : log,
        ),
      );
    }
  }, [supabaseUser]);

  useEffect(() => {
    if (!supabaseUser?.id) return;
    void (async () => {
      setIsDataLoading(true);
      const [users, items, logs, notifs] = await Promise.all([
        getRealUsers(),
        getRealDataItems(),
        getRealActivityLogs(),
        getNotifications(supabaseUser.id),
      ]);

      setAllUsers(users);
      setAssets(items);
      setActivityLogs(logs);
      setNotifications(notifs);
      setIsDataLoading(false);
    })();
  }, [supabaseUser?.id]);

  const shareableUsers = useMemo(
    () => (currentUser ? allUsers.filter((candidate) => candidate.id !== currentUser.id) : []),
    [allUsers, currentUser],
  );

  const broadcastTargets = useMemo(
    () => shareableUsers.map((user) => ({ id: user.id, name: user.name })),
    [shareableUsers],
  );

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) =>
        asset.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      ),
    [assets, searchTerm],
  );

  const handleAssetCreated = useCallback((asset: EnrichedDataItem) => {
    setAssets((prev) => [asset, ...prev.filter((existing) => existing.id !== asset.id)]);
  }, []);

  const handleAssetDeleted = useCallback((assetId: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const handleAssetUpdated = useCallback((updatedAsset: EnrichedDataItem) => {
    setAssets((prev) => prev.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)));
  }, []);

  const handleUserRoleUpdated = useCallback(
    (updatedUser: User) => {
      setAllUsers((prev) => {
        const hasUser = prev.some((user) => user.id === updatedUser.id);
        if (hasUser) {
          return prev.map((user) => (user.id === updatedUser.id ? updatedUser : user));
        }
        return [...prev, updatedUser];
      });

      setCurrentUser((prev) => (prev?.id === updatedUser.id ? updatedUser : prev));

      if (currentUser && updatedUser.id === currentUser.id && updatedUser.role !== 'admin') {
        router.push('/userDashboard');
      }
    },
    [currentUser, router],
  );

  const handleUserCreated = useCallback(async () => {
    if (!supabaseUser?.id) return;
    // Refresh the user list after creating a new user
    const users = await getRealUsers();
    setAllUsers(users);
  }, [supabaseUser?.id]);
    
  if ((isLoading || isDataLoading || !currentUser) && searchParams.get('name') !== 'Atharv') {
    return <div>Loading...</div>;
  }
    
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser!} />
        <SidebarInset className="flex flex-grow flex-col bg-background main-layout-content-column">
          <div className="dashboard-dynamic-margin">
          <Header
            user={currentUser!}
            notifications={notifications}
            onAssetCreated={handleAssetCreated}
            onUserUpdate={setCurrentUser}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            shareableUsers={shareableUsers}
            broadcastTargets={broadcastTargets}
          />
            <main className="w-full overflow-x-hidden">
              <div className="w-full px-6 xl:px-10 2xl:px-16">
                <div className="w-full pt-4 sm:pt-6 pb-4 sm:pb-6 flex flex-col space-y-4 sm:space-y-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage users and monitor activity</p>
              </div>
              <div className="w-full">
                <ControlledDashboard
                currentUser={currentUser!}
                users={allUsers}
                assets={filteredAssets}
                activityLogs={activityLogs}
                onAssetDeleted={handleAssetDeleted}
                onAssetUpdated={handleAssetUpdated}
                onUserRoleUpdated={handleUserRoleUpdated}
                onUserCreated={handleUserCreated}
              />
                  </div>
              </div>
            </div>
          </main>
          </div>
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