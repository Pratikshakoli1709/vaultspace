'use client';

import type { User, FileWithVersions, Folder } from './types';
import { isTeamAdmin, isTeamMember } from './team-service';

/**
 * Check if user can view a file/folder based on visibility rules
 */
export async function canViewItem(
  item: FileWithVersions | Folder,
  currentUser: User
): Promise<boolean> {
  // Admins can see everything
  if (currentUser.role === 'admin') {
    return true;
  }

  const visibility = item.visibility || 'public';
  const ownerId = 'ownerId' in item ? item.ownerId : item.created_by;

  // Owner can always see their items
  if (ownerId === currentUser.id) {
    return true;
  }

  switch (visibility) {
    case 'public':
      return true;

    case 'team':
      if (!item.teamId) {
        return false;
      }
      return await isTeamMember(currentUser.id, item.teamId);

    case 'private':
      // Owner + allowed users
      const allowedUsers = item.allowedUsers || [];
      return allowedUsers.includes(currentUser.id);

    default:
      return false;
  }
}

/**
 * Check if user can edit a file/folder
 */
export async function canEditItem(
  item: FileWithVersions | Folder,
  currentUser: User
): Promise<boolean> {
  // Admins can edit everything
  if (currentUser.role === 'admin') {
    return true;
  }

  const ownerId = 'ownerId' in item ? item.ownerId : item.created_by;

  // Owner can always edit
  if (ownerId === currentUser.id) {
    return true;
  }

  // Team admins can edit team items
  if (item.teamId && item.visibility === 'team') {
    return await isTeamAdmin(currentUser.id, item.teamId);
  }

  return false;
}

/**
 * Check if user can delete a file/folder
 */
export async function canDeleteItem(
  item: FileWithVersions | Folder,
  currentUser: User
): Promise<boolean> {
  // Admins can delete everything
  if (currentUser.role === 'admin') {
    return true;
  }

  const ownerId = 'ownerId' in item ? item.ownerId : item.created_by;

  // Owner can always delete
  if (ownerId === currentUser.id) {
    return true;
  }

  // Team admins can delete team items
  if (item.teamId && item.visibility === 'team') {
    return await isTeamAdmin(currentUser.id, item.teamId);
  }

  return false;
}

/**
 * Filter items based on visibility for a user
 */
export async function filterItemsByVisibility<T extends FileWithVersions | Folder>(
  items: T[],
  currentUser: User
): Promise<T[]> {
  const filtered: T[] = [];

  for (const item of items) {
    if (await canViewItem(item, currentUser)) {
      filtered.push(item);
    }
  }

  return filtered;
}


