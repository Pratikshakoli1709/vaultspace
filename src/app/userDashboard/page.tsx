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
          console.log('UserDashboard - No supabaseUser, redirecting to login');
          router.push('/login');
        } else {
          console.log('UserDashboard - User loaded:', {
            email: supabaseUser.email,
            role: supabaseUser.role,
            id: supabaseUser.id,
          });
          
          if (supabaseUser.role === 'admin') {
            console.log('UserDashboard - User is admin, redirecting to adminDashboard');
            router.push('/adminDashboard');
          } else {
            console.log('UserDashboard - User is regular user, setting current user');
            setCurrentUser(supabaseUser);
          }
        }
      }
    }, [supabaseUser, isLoading, router]);

  const fetchAssets = useCallback(
    async (userId: string) => {
      setIsAssetsLoading(true);

      try {
        // Fetch files from API
        const response = await fetch(`/api/files?userId=${userId}`);
        
        // Check if response is OK and is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // Fallback to direct Supabase query if API returns HTML (error page)
          console.warn('API returned non-JSON response, falling back to direct database query');
          
          // Get user's team memberships for team document filtering
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);
          
          const userTeamIds = (teamMemberships || []).map((tm: any) => tm.team_id);
          
          let query = supabase
            .from('data_items')
            .select(`
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
              folder_id,
              visibility,
              team_id,
              allowed_users,
              profiles:created_by (
                id,
                full_name,
                email,
                avatar_url,
                role
              )
            `);
          
          // Filter: show all non-team files OR team files where user is a member
          if (userTeamIds.length > 0) {
            query = query.or(`team_id.is.null,team_id.in.(${userTeamIds.join(',')})`);
          } else {
            // If user is not in any teams, only show non-team files
            query = query.is('team_id', null);
          }
          
          const { data, error } = await query
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false });

          if (error) {
            throw error;
          }

          // Get starred items for this user
          let starredFileIds: string[] = [];
          try {
            const { data: starredItems } = await supabase
              .from('starred_items')
              .select('item_id')
              .eq('user_id', userId)
              .eq('item_type', 'file');
            starredFileIds = (starredItems || []).map((item: any) => item.item_id);
          } catch (starredError) {
            // Table might not exist - continue
          }

          const mapped = (data || []).map((file: any) => {
            const enriched = mapRowToAsset(file);
            enriched.isStarred = enriched.is_starred || starredFileIds.includes(enriched.id);
            enriched.is_starred = enriched.isStarred;
            return enriched;
          });

          const unique = Array.from(new Map(mapped.map((item: any) => [item.id, item])).values()).map(
            (item) => (currentUser && item.created_by === currentUser.id ? { ...item, uploader: currentUser } : item),
          );
          setUserAssets(unique);
          return;
        }

        const data = await response.json();

        if (data.success && data.files) {
          const unique = Array.from(new Map(data.files.map((item: any) => [item.id, item])).values()).map(
            (item) => (currentUser && item.created_by === currentUser.id ? { ...item, uploader: currentUser } : item),
          );
          setUserAssets(unique);
        } else {
          console.error('Failed to load files:', data.error);
          toast({
            variant: 'destructive',
            title: 'Unable to load files',
            description: data.error || 'Failed to load files',
          });
          setUserAssets([]);
        }
      } catch (error: any) {
        console.error('Failed to load assets for user', error);
        
        // Try fallback to direct Supabase query
        try {
          console.log('Attempting fallback to direct Supabase query...');
          
          // Get user's team memberships for team document filtering
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userId);
          
          const userTeamIds = (teamMemberships || []).map((tm: any) => tm.team_id);
          
          let query = supabase
            .from('data_items')
            .select(`
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
              folder_id,
              visibility,
              team_id,
              allowed_users,
              profiles:created_by (
                id,
                full_name,
                email,
                avatar_url,
                role
              )
            `);
          
          // Filter: show all non-team files OR team files where user is a member
          if (userTeamIds.length > 0) {
            query = query.or(`team_id.is.null,team_id.in.(${userTeamIds.join(',')})`);
          } else {
            // If user is not in any teams, only show non-team files
            query = query.is('team_id', null);
          }
          
          const { data, error: dbError } = await query
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false });

          if (!dbError && data) {
            const mapped = (data || []).map(mapRowToAsset);
            const unique = Array.from(new Map(mapped.map((item: any) => [item.id, item])).values()).map(
              (item) => (currentUser && item.created_by === currentUser.id ? { ...item, uploader: currentUser } : item),
            );
            setUserAssets(unique);
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }

        toast({
          variant: 'destructive',
          title: 'Unable to load assets',
          description: error?.message || 'Failed to load files',
        });
        setUserAssets([]);
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

  // Listen for asset refresh events (e.g., when team documents are uploaded or files are moved)
  useEffect(() => {
    const handleAssetRefresh = () => {
      if (supabaseUser?.id) {
        console.log('🔄 Refreshing assets due to asset refresh event');
        void fetchAssets(supabaseUser.id);
      }
    };
    
    const handleFileMoved = (event: CustomEvent) => {
      if (supabaseUser?.id) {
        console.log('📁 File moved event received:', event.detail);
        // Refresh assets after a short delay to ensure database update is complete
        setTimeout(() => {
          console.log('🔄 Refreshing assets after file move');
          void fetchAssets(supabaseUser.id);
        }, 500);
      }
    };

    window.addEventListener('assets-refresh', handleAssetRefresh);
    window.addEventListener('file-moved', handleFileMoved as EventListener);
    return () => {
      window.removeEventListener('assets-refresh', handleAssetRefresh);
      window.removeEventListener('file-moved', handleFileMoved as EventListener);
    };
  }, [supabaseUser?.id, fetchAssets]);

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
    // Refresh from database to get complete data
    if (supabaseUser?.id) {
      void fetchAssets(supabaseUser.id);
    } else {
      setUserAssets((prev) => [asset, ...prev]);
    }
  }, [supabaseUser?.id, fetchAssets]);

  const handleAssetDeleted = useCallback((assetId: string) => {
    setUserAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const handleAssetUpdated = useCallback((asset: EnrichedDataItem) => {
    // Update the asset in the local state - merge to preserve all fields
    setUserAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, ...asset } : a))
    );
  }, []);

  // Removed files-refresh event listener - we use optimistic updates instead
  // This prevents page refresh when starring files

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