'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUserTeams } from '@/lib/team-service';
import { getEligibleBroadcastTargets } from '@/lib/notifications';
import type { User, Team } from '@/lib/types';

interface VisibilitySelectorProps {
  currentUser: User;
  visibility: 'public' | 'team' | 'private';
  teamId?: string | null;
  allowedUsers?: string[];
  onVisibilityChange: (visibility: 'public' | 'team' | 'private') => void;
  onTeamChange?: (teamId: string | null) => void;
  onAllowedUsersChange?: (userIds: string[]) => void;
}

export function VisibilitySelector({
  currentUser,
  visibility,
  teamId,
  allowedUsers = [],
  onVisibilityChange,
  onTeamChange,
  onAllowedUsersChange,
}: VisibilitySelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set(allowedUsers));

  useEffect(() => {
    const loadData = async () => {
      // Load user's teams
      const userTeams = await getUserTeams(currentUser.id);
      setTeams(userTeams);

      // Load available users for private sharing
      const users = await getEligibleBroadcastTargets();
      setAvailableUsers(users.filter((u) => u.id !== currentUser.id));
    };
    loadData();
  }, [currentUser.id]);

  useEffect(() => {
    setSelectedUsers(new Set(allowedUsers));
  }, [allowedUsers]);

  const handleVisibilityChange = (newVisibility: 'public' | 'team' | 'private') => {
    onVisibilityChange(newVisibility);
    
    // Reset team/private settings when changing visibility
    if (newVisibility !== 'team' && onTeamChange) {
      onTeamChange(null);
    }
    if (newVisibility !== 'private' && onAllowedUsersChange) {
      onAllowedUsersChange([]);
      setSelectedUsers(new Set());
    }
  };

  const handleTeamChange = (newTeamId: string) => {
    if (onTeamChange) {
      onTeamChange(newTeamId === 'none' ? null : newTeamId);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
    if (onAllowedUsersChange) {
      onAllowedUsersChange(Array.from(newSet));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Visibility</Label>
        <Select value={visibility} onValueChange={handleVisibilityChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - Everyone can see</SelectItem>
            <SelectItem value="team">Team - Only team members</SelectItem>
            <SelectItem value="private">Private - Only selected users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibility === 'team' && (
        <div className="grid gap-2">
          <Label>Select Team</Label>
          <Select value={teamId || 'none'} onValueChange={handleTeamChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.length === 0 ? (
                <SelectItem value="none" disabled>
                  No teams available
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {teams.length === 0 && (
            <p className="text-xs text-muted-foreground">
              You are not a member of any teams. Ask an admin to add you to a team.
            </p>
          )}
        </div>
      )}

      {visibility === 'private' && (
        <div className="grid gap-2">
          <Label>Allowed Users</Label>
          <ScrollArea className="h-32 border rounded-md p-2">
            <div className="space-y-2">
              {availableUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No other users available
                </p>
              ) : (
                availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <Label className="text-sm font-normal cursor-pointer">
                      {user.name} ({user.email})
                    </Label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}


