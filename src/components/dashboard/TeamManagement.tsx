'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, UserPlus, UserMinus, Shield, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '@/lib/team-service';
import { getEligibleBroadcastTargets } from '@/lib/notifications';
import type { TeamWithMembers, User, TeamMember } from '@/lib/types';

interface TeamManagementProps {
  currentUser: User;
}

export function TeamManagement({ currentUser }: TeamManagementProps) {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [userAdminStatus, setUserAdminStatus] = useState<Map<string, boolean>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
    loadAvailableUsers();
  }, []);

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

  const loadAvailableUsers = async () => {
    try {
      const users = await getEligibleBroadcastTargets();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: 'Error',
        description: 'Team name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createTeam(newTeamName.trim(), currentUser);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Team created successfully',
        });
        setIsCreateDialogOpen(false);
        setNewTeamName('');
        await loadTeams();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create team',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam || !newTeamName.trim()) {
      return;
    }

    try {
      const result = await updateTeam(selectedTeam.id, newTeamName.trim(), currentUser);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Team updated successfully',
        });
        setIsEditDialogOpen(false);
        setSelectedTeam(null);
        setNewTeamName('');
        await loadTeams();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update team',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) {
      return;
    }

    try {
      const result = await deleteTeam(selectedTeam.id, currentUser);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Team deleted successfully',
        });
        setIsDeleteDialogOpen(false);
        setSelectedTeam(null);
        await loadTeams();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete team',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
    }
  };

  const handleOpenMemberDialog = (team: TeamWithMembers) => {
    setSelectedTeam(team);
    setSelectedUsers(new Set(team.members.map((m) => m.userId)));
    const adminMap = new Map<string, boolean>();
    team.members.forEach((m) => {
      adminMap.set(m.userId, m.isAdmin);
    });
    setUserAdminStatus(adminMap);
    setIsMemberDialogOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!selectedTeam) {
      return;
    }

    try {
      // Get current member IDs
      const currentMemberIds = new Set(selectedTeam.members.map((m) => m.userId));

      // Add new members and update existing ones
      for (const userId of selectedUsers) {
        const isAdmin = userAdminStatus.get(userId) || false;
        
        if (!currentMemberIds.has(userId)) {
          // New member - add them
          const result = await addTeamMember(selectedTeam.id, userId, isAdmin, currentUser);
          if (!result.success) {
            console.error(`Failed to add member ${userId}:`, result.error);
            toast({
              title: 'Warning',
              description: result.error || `Failed to add member`,
              variant: 'destructive',
            });
          }
        } else {
          // Existing member - check if admin status changed
          const currentMember = selectedTeam.members.find((m) => m.userId === userId);
          if (currentMember && currentMember.isAdmin !== isAdmin) {
            // Admin status changed, update it
            const result = await addTeamMember(selectedTeam.id, userId, isAdmin, currentUser);
            if (!result.success) {
              console.error(`Failed to update member ${userId}:`, result.error);
              toast({
                title: 'Warning',
                description: result.error || `Failed to update member`,
                variant: 'destructive',
              });
            }
          }
          // If admin status didn't change, no action needed
        }
      }

      // Remove members that are no longer selected
      for (const member of selectedTeam.members) {
        if (!selectedUsers.has(member.userId)) {
          await removeTeamMember(selectedTeam.id, member.userId, currentUser);
        }
      }

      toast({
        title: 'Success',
        description: 'Team members updated successfully',
      });
      setIsMemberDialogOpen(false);
      setSelectedTeam(null);
      await loadTeams();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team members',
        variant: 'destructive',
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
      userAdminStatus.delete(userId);
    } else {
      newSet.add(userId);
      userAdminStatus.set(userId, false);
    }
    setSelectedUsers(newSet);
    setUserAdminStatus(new Map(userAdminStatus));
  };

  const toggleAdminStatus = (userId: string) => {
    const newMap = new Map(userAdminStatus);
    newMap.set(userId, !(newMap.get(userId) || false));
    setUserAdminStatus(newMap);
  };

  if (currentUser.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Only admins can manage teams</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Create and manage teams for your organization</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teams yet. Create your first team to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Admins</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{team.memberCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{team.adminCount}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenMemberDialog(team)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team);
                            setNewTeamName(team.name);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Team Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Enter a name for the new team</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., Engineering, Sales, HR"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update the team name</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTeam}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTeam?.name}&quot;? This action cannot be
              undone and will remove all team members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Team Members: {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Add or remove members and assign team admins</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-2">
              {availableUsers.map((user) => {
                const isSelected = selectedUsers.has(user.id);
                const isAdmin = userAdminStatus.get(user.id) || false;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <Button
                        variant={isAdmin ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleAdminStatus(user.id)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {isAdmin ? 'Team Admin' : 'Make Admin'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMembers}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

