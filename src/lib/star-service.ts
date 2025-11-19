'use client';

import supabase from './supabaseClient';
import { notifyAllAdmins } from './notifications';
import type { User } from './types';

/**
 * Star a file or folder - persists to database
 */
export async function starFile(
  fileId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, try to insert into starred_items table
    const { error: insertError } = await supabase
      .from('starred_items')
      .insert({
        user_id: currentUser.id,
        item_id: fileId,
        item_type: 'file',
      });

    if (insertError) {
      // If it's a duplicate key error, it's already starred - that's okay
      if (insertError.code !== '23505') { // 23505 is unique_violation
        throw insertError;
      }
    }

    // Also update is_starred on data_items for backward compatibility
    const { error: updateError } = await supabase
      .from('data_items')
      .update({ is_starred: true, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (updateError) {
      console.warn('Failed to update is_starred on data_items:', updateError);
      // Don't fail if this update fails - starred_items is the source of truth
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File was starred by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file star:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error starring file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to star file',
    };
  }
}

/**
 * Unstar a file or folder - persists to database
 */
export async function unstarFile(
  fileId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Remove from starred_items table
    const { error: deleteError } = await supabase
      .from('starred_items')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('item_id', fileId)
      .eq('item_type', 'file');

    if (deleteError) {
      throw deleteError;
    }

    // Also update is_starred on data_items for backward compatibility
    const { error: updateError } = await supabase
      .from('data_items')
      .update({ is_starred: false, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (updateError) {
      console.warn('Failed to update is_starred on data_items:', updateError);
      // Don't fail if this update fails - starred_items is the source of truth
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `File was unstarred by ${currentUser.name}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about file unstar:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error unstarring file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unstar file',
    };
  }
}

/**
 * Star a folder - persists to database
 */
export async function starFolder(
  folderId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert into starred_items table
    const { error: insertError } = await supabase
      .from('starred_items')
      .insert({
        user_id: currentUser.id,
        item_id: folderId,
        item_type: 'folder',
      });

    if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
      throw insertError;
    }

    // Also update is_starred on folders table
    const { error: updateError } = await supabase
      .from('folders')
      .update({ is_starred: true, updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (updateError) {
      console.warn('Failed to update is_starred on folders:', updateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error starring folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to star folder',
    };
  }
}

/**
 * Unstar a folder - persists to database
 */
export async function unstarFolder(
  folderId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Remove from starred_items table
    const { error: deleteError } = await supabase
      .from('starred_items')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('item_id', folderId)
      .eq('item_type', 'folder');

    if (deleteError) {
      throw deleteError;
    }

    // Also update is_starred on folders table
    const { error: updateError } = await supabase
      .from('folders')
      .update({ is_starred: false, updated_at: new Date().toISOString() })
      .eq('id', folderId);

    if (updateError) {
      console.warn('Failed to update is_starred on folders:', updateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error unstarring folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unstar folder',
    };
  }
}

/**
 * Get all starred items for a user from database
 */
export async function getStarredItems(
  userId: string
): Promise<{ files: string[]; folders: string[] }> {
  try {
    const { data, error } = await supabase
      .from('starred_items')
      .select('item_id, item_type')
      .eq('user_id', userId);

    if (error) {
      // If table doesn't exist, return empty arrays silently (graceful degradation)
      if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        // Table doesn't exist yet - silently return empty arrays
        // User needs to run migration, but don't spam console
        return { files: [], folders: [] };
      }
      
      // For other errors, only log if it's not a permission/table issue
      if (error.code !== '42501' && error.code !== 'PGRST301') {
        console.warn('Error fetching starred items:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
      }
      return { files: [], folders: [] };
    }

    const files = (data || [])
      .filter((item) => item.item_type === 'file')
      .map((item) => item.item_id);
    
    const folders = (data || [])
      .filter((item) => item.item_type === 'folder')
      .map((item) => item.item_id);

    return { files, folders };
  } catch (error: any) {
    // Handle unexpected errors silently - table might not exist
    // Don't log empty error objects or common table-not-found errors
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    // Only log if it's a meaningful error (not table not found)
    if (errorMessage && !errorMessage.includes('does not exist') && !errorMessage.includes('relation') && errorCode !== '42P01' && errorCode !== 'PGRST116') {
      console.warn('Error getting starred items:', errorMessage);
    }
    
    return { files: [], folders: [] };
  }
}

