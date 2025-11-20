'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, ArrowLeft, Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTeams, type TeamWithMembers } from '@/lib/team-service';
import type { User, EnrichedDataItem } from '@/lib/types';
import { FolderView } from './FolderView';
import { UploadAssetDialog } from './UploadAssetDialog';

interface TeamsViewProps {
  currentUser: User;
  onAssetCreated?: (asset: EnrichedDataItem) => void;
  onAssetDeleted?: (assetId: string) => void;
  onAssetUpdated?: (asset: EnrichedDataItem) => void;
}

export function TeamsView({
  currentUser,
  onAssetCreated,
  onAssetDeleted,
  onAssetUpdated,
}: TeamsViewProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [teamAssets, setTeamAssets] = useState<EnrichedDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamAssets(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const loadedTeams = await getTeams(currentUser);
      setTeams(loadedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamAssets = async (teamId: string) => {
    setIsLoadingAssets(true);
    try {
      const { default: supabase } = await import('@/lib/supabaseClient');
      
      // First verify user is a team member
      const { data: membershipCheck } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      if (!membershipCheck) {
        console.warn(`User ${currentUser.id} is not a member of team ${teamId}`);
        toast({
          title: 'Access Denied',
          description: 'You are not a member of this team.',
          variant: 'destructive',
        });
        setTeamAssets([]);
        return;
      }
      
      console.log(`Loading team assets for team ${teamId}, user ${currentUser.id}`);
      
      // Load all documents for this team (regardless of who created them)
      // IMPORTANT: This query should return ALL documents with this team_id, not just the current user's
      const { data, error } = await supabase
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
        `)
        .eq('team_id', teamId) // Filter by team_id - this should show ALL team documents
        .order('updated_at', { ascending: false });
      
      console.log(`Query executed: team_id = ${teamId}`);
      console.log(`Query result: ${data?.length || 0} documents found`);
      if (data && data.length > 0) {
        console.log('Documents found:', data.map(d => ({ 
          id: d.id, 
          title: d.title, 
          created_by: d.created_by,
          team_id: d.team_id,
          uploader: d.profiles?.full_name || 'Unknown'
        })));
      }

      if (error) {
        // If team_id column doesn't exist, try alternative approach
        if (error.message?.includes('column') || error.code === '42703' || error.message?.includes('team_id')) {
          console.warn('team_id column may not exist, trying to load by team members');
          // Get team members and load their recent uploads
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId);
          
          const memberIds = (teamMembers || []).map((tm: any) => tm.user_id);
          
          if (memberIds.length === 0) {
            setTeamAssets([]);
            return;
          }
          
          // Load assets created by team members in the last 7 days as a workaround
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: altData, error: altError } = await supabase
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
            `)
            .in('created_by', memberIds)
            .gte('created_at', sevenDaysAgo)
            .order('updated_at', { ascending: false });
          
          if (altError) {
            throw altError;
          }
          
          const { mapRowToAsset } = await import('@/lib/supabase-mappers');
          const mapped = (altData || []).map(mapRowToAsset);
          console.log(`Loaded ${mapped.length} team assets (fallback method) for team ${teamId}`);
          setTeamAssets(mapped);
          return;
        }
        throw error;
      }

      const { mapRowToAsset } = await import('@/lib/supabase-mappers');
      const mapped = (data || []).map(mapRowToAsset);
      console.log(`Loaded ${mapped.length} team assets for team ${teamId}`);
      console.log('Team assets details:', mapped.map(a => ({ 
        id: a.id, 
        title: a.title, 
        teamId: a.teamId,
        createdBy: a.created_by,
        uploader: a.uploader?.name || 'Unknown'
      })));
      setTeamAssets(mapped);
    } catch (error) {
      console.error('Failed to load team assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team documents. Please ensure team_id column exists in data_items table.',
        variant: 'destructive',
      });
      setTeamAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleAssetCreated = async (asset: EnrichedDataItem) => {
    // Reload team assets to ensure we have the latest data
    if (selectedTeam) {
      await loadTeamAssets(selectedTeam.id);
    }
    onAssetCreated?.(asset);
    
    // Dispatch event to refresh main dashboard assets so all team members see the new document
    window.dispatchEvent(new CustomEvent('assets-refresh', { 
      detail: { teamId: selectedTeam?.id, assetId: asset.id } 
    }));
  };

  const handleAssetDeleted = (assetId: string) => {
    setTeamAssets((prev) => prev.filter((a) => a.id !== assetId));
    onAssetDeleted?.(assetId);
  };

  const handleAssetUpdated = (asset: EnrichedDataItem) => {
    setTeamAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, ...asset } : a))
    );
    onAssetUpdated?.(asset);
  };

  // Calculate team-specific recent files (last 7 days, sorted by updated_at)
  const teamRecentFiles = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return teamAssets
      .filter((file) => {
        const updatedAt = new Date(file.updated_at || file.created_at).getTime();
        return updatedAt >= sevenDaysAgo;
      })
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return bTime - aTime;
      })
      .map((file) => ({
        ...file,
        folderId: file.folderId ?? null,
        isStarred: file.isStarred || file.is_starred || false,
        is_starred: file.isStarred || file.is_starred || false,
        lastAccessed: null,
        versions: file.versions || [],
        currentVersion: file.currentVersion || 1,
      }));
  }, [teamAssets]);

  // Calculate team-specific starred files
  const teamStarredItems = useMemo(() => {
    return teamAssets
      .filter((file) => file.isStarred === true || file.is_starred === true)
      .map((file) => ({
        ...file,
        folderId: file.folderId ?? null,
        isStarred: true,
        is_starred: true,
        lastAccessed: null,
        versions: file.versions || [],
        currentVersion: file.currentVersion || 1,
      }));
  }, [teamAssets]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (selectedTeam) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTeam(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedTeam.memberCount} member{selectedTeam.memberCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Documents</CardTitle>
                <CardDescription>
                  Documents uploaded to this team are only accessible by team members
                </CardDescription>
              </div>
              <UploadAssetDialog
                user={currentUser}
                onAssetCreated={handleAssetCreated}
                teamId={selectedTeam.id}
              >
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </UploadAssetDialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : teamAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents yet. Upload the first document for this team.</p>
              </div>
            ) : (
              <FolderView
                files={teamAssets}
                currentUser={currentUser}
                onFileDeleted={handleAssetDeleted}
                onFileUpdated={handleAssetUpdated}
                viewMode="list"
                externalDndContext={true}
                hideNewFolder={true}
                teamScopedRecentFiles={teamRecentFiles}
                teamScopedStarredItems={teamStarredItems}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          My Teams
        </CardTitle>
        <CardDescription>
          Select a team to view and upload team documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You are not a member of any teams yet.</p>
            <p className="text-sm mt-2">Contact an admin to be added to a team.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedTeam(team)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <CardDescription>
                    {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {team.members
                        .slice(0, 3)
                        .map((m) => m.user?.name || 'Unknown')
                        .join(', ')}
                      {team.memberCount > 3 && ` +${team.memberCount - 3} more`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

