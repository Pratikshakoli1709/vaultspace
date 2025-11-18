'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { getNotifications, getRealUsers } from '@/lib/data';
import type { EnrichedNotification, EnrichedDataItem, EnrichedActivityLog, User } from '@/lib/types';
import { mapRowToActivityLog, mapRowToAsset } from '@/lib/supabase-mappers';
import { useSupabase } from '@/components/SupabaseProvider';
import supabase from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

function UserDashboardPageContent() {
    const router = useRouter();
    const { user: supabaseUser, isLoading } = useSupabase();
  const { toast } = useToast();
    
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [userAssets, setUserAssets] = useState<EnrichedDataItem[]>([]);
  const [userActivity, setUserActivity] = useState<EnrichedActivityLog[]>([]);
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [shareableUsers, setShareableUsers] = useState<User[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const broadcastTargets = useMemo(
    () => shareableUsers.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    [shareableUsers],
  );

    useEffect(() => {
      if (!isLoading) {
        if (!supabaseUser) {
          console.log('No supabaseUser, redirecting to login');
          router.push('/login');
        } else if (supabaseUser.role === 'admin') {
          console.log('User is admin, redirecting to adminDashboard');
          router.push('/adminDashboard');
        } else {
          console.log('User is regular user, setting current user:', supabaseUser.email);
          setCurrentUser(supabaseUser);
        }
      }
    }, [supabaseUser, isLoading, router]);

  const fetchAssets = useCallback(
    async (userId: string) => {
      setIsAssetsLoading(true);

      const { data, error } = await supabase
        .from('data_items')
        .select(
          `
            id,
            title,
            type,
            file_url,
            link_url,
            text_content,
            storage_path,
            created_by,
            updated_by,
            created_at,
            updated_at,
            profiles:created_by (
              id,
              full_name,
              email,
              avatar_url,
              role,
              created_at
            ),
            asset_shares (
              user_id
            )
          `,
        )
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load assets for user', error);
        toast({
          variant: 'destructive',
          title: 'Unable to load assets',
          description: error.message,
        });
        setUserAssets([]);
      } else {
        const mapped = (data ?? []).map(mapRowToAsset);
        const unique = Array.from(new Map(mapped.map((item) => [item.id, item])).values()).map(
          (item) => (currentUser && item.created_by === currentUser.id ? { ...item, uploader: currentUser } : item),
        );
        setUserAssets(unique);
      }

      setIsAssetsLoading(false);
    },
    [toast, currentUser],
  );

  const fetchActivity = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(
          `
            id,
            user_id,
            item_id,
            action,
            item_title,
            timestamp,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url,
              role,
              created_at
            )
          `,
        )
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to load activity logs for user', error);
        return;
      }

      setUserActivity((data ?? []).map(mapRowToActivityLog));
    },
    [],
  );

  useEffect(() => {
    if (supabaseUser?.id) {
      void fetchAssets(supabaseUser.id);
      void fetchActivity(supabaseUser.id);
    }
  }, [supabaseUser?.id, fetchAssets, fetchActivity]);

  useEffect(() => {
    if (!supabaseUser?.id) return;
    void (async () => {
      const data = await getNotifications(supabaseUser.id);
      setNotifications(data);
    })();
  }, [supabaseUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    void (async () => {
      const users = await getRealUsers();
      const filtered = users.filter((candidate) => candidate.id !== currentUser.id);
      setShareableUsers(filtered);
    })();
  }, [currentUser?.id]);

  const filteredAssets = useMemo(
    () =>
      userAssets.filter((asset) =>
        asset.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
      ),
    [userAssets, searchTerm],
  );

  const handleAssetCreated = useCallback((asset: EnrichedDataItem) => {
    setUserAssets((prev) => [asset, ...prev]);
  }, []);

  const handleAssetDeleted = useCallback((assetId: string) => {
    setUserAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const handleAssetUpdated = useCallback((updatedAsset: EnrichedDataItem) => {
    setUserAssets((prev) => prev.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)));
  }, []);

  if (isLoading || isAssetsLoading || !currentUser) {
      return <div>Loading...</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <AppSidebar user={currentUser} />
        <SidebarInset className="flex flex-grow flex-col bg-background main-layout-content-column">
          <div className="dashboard-dynamic-margin">
            <Header
              user={currentUser}
              notifications={notifications}
              onAssetCreated={handleAssetCreated}
              onUserUpdate={setCurrentUser}
              shareableUsers={shareableUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              broadcastTargets={broadcastTargets}
            />
            <main className="w-full overflow-x-hidden">
              <div className="w-full px-6 xl:px-10 2xl:px-16">
                <div className="w-full pt-4 sm:pt-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                  <Dashboard
                    currentUser={currentUser}
                    assets={filteredAssets}
                    activityLogs={userActivity}
                    onAssetDeleted={handleAssetDeleted}
                    onAssetUpdated={handleAssetUpdated}
                  />
                </div>
              </div>
            </main>
          </div>
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