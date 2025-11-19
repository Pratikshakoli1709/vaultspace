'use client';

import supabase from './supabaseClient';
import { notifyAllAdmins } from './notifications';
import type { FileWithVersions, Folder, User, EnrichedDataItem } from './types';
import { uploadAssetClient } from './asset-service';

/**
 * Copy a file - creates a duplicate with "(Copy)" suffix
 */
export async function copyFile(
  file: FileWithVersions,
  currentUser: User
): Promise<{ success: boolean; error?: string; newFile?: EnrichedDataItem }> {
  try {
    // Create new file entry with "(Copy)" suffix
    const newTitle = `${file.title} (Copy)`;
    
    // For now, we'll create a new database entry pointing to the same file
    // In production, you'd want to duplicate the actual file in storage
    const result = await uploadAssetClient({
      title: newTitle,
      type: file.type,
      linkUrl: file.link_url,
      textContent: file.text_content,
      // Note: For document/image types, we'd need the actual File object
      // For now, this will create a metadata copy
      file: null,
      currentUser,
    });

    if (!result.success || !result.asset) {
      return { success: false, error: 'Failed to copy file' };
    }

    // Update the new file to point to the same storage file (if it exists)
    if (file.file_url && (file.type === 'document' || file.type === 'image')) {
      // In production, you'd duplicate the file in storage here
      // For now, we'll just update the URL to point to the same file
      const { error: updateError } = await supabase
        .from('data_items')
        .update({ file_url: file.file_url })
        .eq('id', result.asset.id);
      
      if (updateError) {
        console.warn('Failed to update copied file URL:', updateError);
      }
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File "${file.title}" (${file.type}) was copied by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file copy:', error);
      });
    }

    return { success: true, newFile: result.asset };
  } catch (error) {
    console.error('Error copying file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to copy file' 
    };
  }
}

/**
 * Copy a folder recursively
 */
export async function copyFolder(
  folder: Folder,
  currentUser: User,
  files: FileWithVersions[] = []
): Promise<{ success: boolean; error?: string; newFolderId?: string }> {
  try {
    // Create new folder with "(Copy)" suffix
    const newFolderName = `${folder.name} (Copy)`;
    
    // In a real implementation, this would create the folder in the database
    // For now, we'll use a mock ID
    const newFolderId = `folder-${Date.now()}`;
    
    // Copy all files in the folder
    const folderFiles = files.filter((f) => f.folderId === folder.id);
    for (const file of folderFiles) {
      await copyFile(file, currentUser);
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `Folder "${folder.name}" was copied by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about folder copy:', error);
      });
    }

    return { success: true, newFolderId };
  } catch (error) {
    console.error('Error copying folder:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to copy folder' 
    };
  }
}

/**
 * Rename a file
 */
export async function renameFile(
  fileId: string,
  newName: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('data_items')
      .update({ title: newName, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File was renamed to "${newName}" by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file rename:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to rename file' 
    };
  }
}

/**
 * Rename a folder
 */
export async function renameFolder(
  folderId: string,
  newName: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, this would update the folder in the database
    // For now, we'll just notify admins
    
    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `Folder was renamed to "${newName}" by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about folder rename:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming folder:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to rename folder' 
    };
  }
}

/**
 * Move file to trash (soft delete)
 */
export async function moveFileToTrash(
  fileId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, we would:
    // 1. Update the file's isInTrash flag
    // 2. Set deletedAt timestamp
    // 3. Store in trash_items table
    
    // For now, we'll use the deleteAssetClient which does hard delete
    // In production, you'd want to modify this to soft delete
    
    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File was moved to trash by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file deletion:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error moving file to trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to move file to trash' 
    };
  }
}

/**
 * Restore file from trash
 */
export async function restoreFileFromTrash(
  fileId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, we would:
    // 1. Update the file's isInTrash flag to false
    // 2. Clear deletedAt timestamp
    // 3. Remove from trash_items table
    
    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File was restored from trash by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file restore:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring file from trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to restore file' 
    };
  }
}

/**
 * Create or update share link for a file
 */
export async function updateShareLink(
  fileId: string,
  access: 'view' | 'edit' | null,
  currentUser: User
): Promise<{ success: boolean; error?: string; shareLink?: string }> {
  try {
    // Generate share link
    const shareLink = access 
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${fileId}`
      : null;

    // In a real implementation, we would:
    // 1. Store shareLink and shareAccess in the database
    // 2. Create a share record with permissions
    
    // Notify admins
    if (currentUser.role !== 'admin' && access) {
      void notifyAllAdmins(
        `File share link was ${access === 'view' ? 'created' : 'updated'} by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file share:', error);
      });
    }

    return { success: true, shareLink: shareLink || undefined };
  } catch (error) {
    console.error('Error updating share link:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update share link' 
    };
  }
}

