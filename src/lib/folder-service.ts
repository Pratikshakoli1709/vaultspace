'use client';

import supabase from './supabaseClient';
import { notifyAllAdmins } from './notifications';
import type { User } from './types';

/**
 * Move a file to a folder (or root if folderId is null)
 */
export async function moveFileToFolder(
  fileId: string,
  folderId: string | null,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize fileId - remove any "file-" prefix if present
    const normalizedFileId = fileId.startsWith('file-') ? fileId.replace('file-', '') : fileId;
    
    // Validate fileId is a UUID
    if (!normalizedFileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('Invalid file ID format:', normalizedFileId);
      return { success: false, error: 'Invalid file ID format' };
    }
    
    // Normalize folderId - only accept valid UUIDs or null
    // "starred", "recent", "root" are special folder views, not actual folder IDs
    let normalizedFolderId: string | null = null;
    if (folderId && folderId !== 'starred' && folderId !== 'recent' && folderId !== 'root') {
      // Validate UUID format
      if (folderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        normalizedFolderId = folderId;
      } else {
        // Invalid folder ID - treat as root (null)
        normalizedFolderId = null;
      }
    }

    // Get file info for notifications
    const { data: fileData, error: fileError } = await supabase
      .from('data_items')
      .select('title, type, folder_id')
      .eq('id', normalizedFileId)
      .maybeSingle();

    if (fileError) {
      console.error('Error fetching file:', fileError);
      console.error('File ID used:', normalizedFileId);
      return { success: false, error: fileError.message || 'Failed to fetch file' };
    }

    if (!fileData) {
      // File not found - likely deleted, return error but don't log as error (use warn instead)
      // This prevents console spam when deleted files are dragged
      return { success: false, error: 'File not found. The file may have been deleted or you may not have permission to access it.' };
    }

    // Check if file is already in the target folder
    const currentFolderId = fileData.folder_id || null;
    if (currentFolderId === normalizedFolderId) {
      return { success: true }; // Already in the right place
    }

    // Update file's folder_id
    // Note: We'll use a custom column name that matches the database
    // If the column doesn't exist yet, we'll need to add it
    const { error: updateError } = await supabase
      .from('data_items')
      .update({
        folder_id: normalizedFolderId,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
      })
      .eq('id', normalizedFileId);

    if (updateError) {
      // If column doesn't exist, provide clear instructions
      if (updateError.message.includes('column') && updateError.message.includes('folder_id')) {
        console.error('folder_id column does not exist in database');
        return { 
          success: false, 
          error: 'Database migration required: Please run the SQL migration script (setup-folder-column.sql) in your Supabase SQL editor to add the folder_id column to the data_items table.' 
        };
      }
      return { success: false, error: updateError.message };
    }

    // Notify admins if user is not admin
    if (currentUser.role !== 'admin') {
      const folderName = normalizedFolderId ? `folder ${normalizedFolderId}` : 'root';
      void notifyAllAdmins(
        `File "${fileData.title}" (${fileData.type}) was moved to ${folderName} by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file move:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error moving file to folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move file to folder',
    };
  }
}

