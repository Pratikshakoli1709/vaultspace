'use client';

import supabase from './supabaseClient';
import { notifyAllAdmins, notifyUser } from './notifications';
import type { Team, TeamMember, TeamWithMembers, User } from './types';

/**
 * Get all teams (admins see all, users see only their teams)
 */
export async function getTeams(currentUser: User): Promise<TeamWithMembers[]> {
  try {
    let query = supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    // If not admin, filter to only teams user is a member of
    if (currentUser.role !== 'admin') {
      const { data: memberData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', currentUser.id);

      const teamIds = memberData?.map((m) => m.team_id) || [];
      if (teamIds.length === 0) {
        return [];
      }
      query = query.in('id', teamIds);
    }

    const { data: teams, error } = await query;

    if (error) {
      console.error('Failed to fetch teams:', error);
      return [];
    }

    // Fetch members for each team
    // Note: Admins can see all members, regular users can see members of teams they belong to
    const teamsWithMembers = await Promise.all(
      (teams || []).map(async (team) => {
        // For admins, fetch all members. For regular users, they can only see members of teams they're in
        const { data: members } = await supabase
          .from('team_members')
          .select('*, profiles:user_id(id, full_name, email, avatar_url)')
          .eq('team_id', team.id);

        const enrichedMembers: TeamMember[] = (members || []).map((m: any) => ({
          id: m.id,
          teamId: m.team_id,
          userId: m.user_id,
          isAdmin: m.is_admin,
          addedBy: m.added_by,
          addedAt: m.added_at,
          user: m.profiles
            ? {
                id: m.profiles.id,
                name: m.profiles.full_name || m.profiles.email,
                email: m.profiles.email,
                avatarUrl: m.profiles.avatar_url || `https://i.pravatar.cc/150?u=${m.profiles.email}`,
                role: 'user' as const,
                createdAt: '',
              }
            : undefined,
        }));

        return {
          id: team.id,
          name: team.name,
          createdBy: team.created_by,
          createdAt: team.created_at,
          updatedAt: team.updated_at,
          members: enrichedMembers,
          memberCount: enrichedMembers.length,
          adminCount: enrichedMembers.filter((m) => m.isAdmin).length,
        };
      })
    );

    return teamsWithMembers;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

/**
 * Create a new team (Admin only)
 */
export async function createTeam(
  name: string,
  currentUser: User
): Promise<{ success: boolean; error?: string; team?: Team }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can create teams' };
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      team: {
        id: data.id,
        name: data.name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (error) {
    console.error('Error creating team:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create team',
    };
  }
}

/**
 * Update team name (Admin only)
 */
export async function updateTeam(
  teamId: string,
  newName: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can update teams' };
    }

    const { error } = await supabase
      .from('teams')
      .update({
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating team:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update team',
    };
  }
}

/**
 * Delete a team (Admin only)
 */
export async function deleteTeam(
  teamId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can delete teams' };
    }

    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting team:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete team',
    };
  }
}

/**
 * Add member to team (Admin only)
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  isAdmin: boolean,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can add team members' };
    }

    // Get team info first for notifications
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    // Check if already a member
    const { data: existing, error: checkError } = await supabase
      .from('team_members')
      .select('id, is_admin')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, other errors are not
      return { success: false, error: checkError.message };
    }

    let wasAdmin = false;
    let isNewMember = false;

    if (existing) {
      wasAdmin = existing.is_admin || false;
      
      // Only update if admin status actually changed
      if (wasAdmin !== isAdmin) {
        const { error } = await supabase
          .from('team_members')
          .update({
            is_admin: isAdmin,
            added_by: currentUser.id,
          })
          .eq('id', existing.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // No change needed, but still return success
        return { success: true };
      }
    } else {
      isNewMember = true;
      // Add new member
      const { error } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        is_admin: isAdmin,
        added_by: currentUser.id,
      });

      if (error) {
        // Check if it's a duplicate key error (race condition)
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          // Member was added between check and insert, try to update instead
          const { data: existingAfterInsert } = await supabase
            .from('team_members')
            .select('id, is_admin')
            .eq('team_id', teamId)
            .eq('user_id', userId)
            .maybeSingle();

          if (existingAfterInsert) {
            wasAdmin = existingAfterInsert.is_admin || false;
            if (wasAdmin !== isAdmin) {
              const { error: updateError } = await supabase
                .from('team_members')
                .update({
                  is_admin: isAdmin,
                  added_by: currentUser.id,
                })
                .eq('id', existingAfterInsert.id);

              if (updateError) {
                return { success: false, error: updateError.message };
              }
            }
            // Member exists now, treat as update
            isNewMember = false;
          } else {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: error.message };
        }
      }
    }

    // Send appropriate notification based on the action
    let notificationMessage = '';
    
    if (isNewMember) {
      // New member added
      if (isAdmin) {
        notificationMessage = `You have been added to the "${team.name}" team as a Team Admin by ${currentUser.name || 'Admin'}. You can now manage files and folders within this team.`;
      } else {
        notificationMessage = `You have been added to the "${team.name}" team by ${currentUser.name || 'Admin'}. You now have access to team files and folders.`;
      }
    } else {
      // Existing member - check if admin status changed
      if (!wasAdmin && isAdmin) {
        notificationMessage = `You have been promoted to Team Admin of the "${team.name}" team by ${currentUser.name || 'Admin'}. You can now manage files and folders within this team.`;
      } else if (wasAdmin && !isAdmin) {
        notificationMessage = `Your Team Admin status has been removed from the "${team.name}" team by ${currentUser.name || 'Admin'}. You still have access to team files.`;
      } else {
        // No change, but still notify about update
        notificationMessage = `Your membership in the "${team.name}" team has been updated by ${currentUser.name || 'Admin'}.`;
      }
    }

    // Send notification (non-blocking)
    if (notificationMessage) {
      notifyUser(userId, notificationMessage, currentUser.id).catch((error) => {
        console.warn('Failed to send team notification:', error);
        // Don't fail the operation if notification fails
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add team member',
    };
  }
}

/**
 * Remove member from team (Admin only)
 */
export async function removeTeamMember(
  teamId: string,
  userId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can remove team members' };
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Get team info for notification
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (team) {
      // Send notification (non-blocking)
      const notificationMessage = `You have been removed from the "${team.name}" team by ${currentUser.name || 'Admin'}. You no longer have access to team files and folders.`;
      
      notifyUser(userId, notificationMessage, currentUser.id).catch((error) => {
        console.warn('Failed to send team removal notification:', error);
        // Don't fail the operation if notification fails
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove team member',
    };
  }
}

/**
 * Get user's teams
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  try {
    const { data: memberData } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('user_id', userId);

    if (!memberData) {
      return [];
    }

    return memberData
      .map((m: any) => m.teams)
      .filter(Boolean)
      .map((team: any) => ({
        id: team.id,
        name: team.name,
        createdBy: team.created_by,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      }));
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return [];
  }
}

/**
 * Check if user is team admin
 */
export async function isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('team_members')
      .select('is_admin')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    return data?.is_admin || false;
  } catch (error) {
    console.error('Error checking team admin:', error);
    return false;
  }
}

/**
 * Check if user is team member
 */
export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking team member:', error);
    return false;
  }
}

