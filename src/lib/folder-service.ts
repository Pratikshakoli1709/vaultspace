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

            // Get file info for notifications and permission check
            const { data: fileData, error: fileError } = await supabase
              .from('data_items')
              .select('title, type, folder_id, created_by')
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

            // Note: Any authenticated user can move files (drag and drop)
            // Permission is enforced by RLS policy, not by code

    // Check if file is already in the target folder
    const currentFolderId = fileData.folder_id || null;
    console.log('📁 File move check:', {
      fileId: normalizedFileId,
      fileTitle: fileData.title,
      fileType: fileData.type,
      currentFolderId: currentFolderId,
      targetFolderId: normalizedFolderId,
      alreadyInPlace: currentFolderId === normalizedFolderId
    });
    
    if (currentFolderId === normalizedFolderId) {
      console.log('✅ File already in target folder, skipping move');
      return { success: true }; // Already in the right place
    }

    // Update file's folder_id
    // Note: We'll use a custom column name that matches the database
    // If the column doesn't exist yet, we'll need to add it
    console.log(`Moving file ${normalizedFileId} to folder ${normalizedFolderId || 'root'}`);
    
    // Try to update folder_id
    console.log('🔄 Attempting to update folder_id:', {
      fileId: normalizedFileId,
      folderId: normalizedFolderId,
      userId: currentUser.id
    });
    
    // Update folder_id - don't use .single() as it fails with 406 if no rows are returned
    const { error: updateError, data: updateData } = await supabase
      .from('data_items')
      .update({
        folder_id: normalizedFolderId,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
      })
      .eq('id', normalizedFileId)
      .select('id, folder_id, title, type'); // Select to verify the update (returns array, not single)

    if (updateError) {
      console.error('❌ Error updating folder_id:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        fileId: normalizedFileId,
        folderId: normalizedFolderId
      });
      
      // Handle 406 error (Cannot coerce to single JSON object) - means no rows were returned
      if (updateError.code === 'PGRST116' || updateError.message?.includes('Cannot coerce') || updateError.message?.includes('406')) {
        console.error('❌ Update returned no rows - RLS policy may be blocking or file does not exist');
        // Try to verify if file exists and check RLS
        const { data: checkFile } = await supabase
          .from('data_items')
          .select('id, folder_id, created_by')
          .eq('id', normalizedFileId)
          .maybeSingle();
        
        if (!checkFile) {
          return { 
            success: false, 
            error: 'File not found or you do not have permission to update it. Please check RLS policies.' 
          };
        }
        
        if (checkFile.created_by !== currentUser.id && currentUser.role !== 'admin') {
          return { 
            success: false, 
            error: 'Permission denied: You can only move files you created. RLS policy may be blocking the update.' 
          };
        }
        
        return { 
          success: false, 
          error: 'Update failed: RLS policy is blocking the update. Please run fix-folder-id-persistence.sql in Supabase SQL editor.' 
        };
      }
      
      // If column doesn't exist, provide clear instructions
      if (updateError.message?.includes('column') || updateError.code === '42703' || updateError.message?.includes('folder_id')) {
        console.error('❌ folder_id column does not exist in database or RLS policy is blocking');
        return { 
          success: false, 
          error: 'Database migration required: Please run fix-folder-id-persistence.sql in your Supabase SQL editor. Error: ' + updateError.message
        };
      }
      
      // Check if it's an RLS policy issue
      if (updateError.code === '42501' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
        console.error('❌ RLS policy is blocking the update');
        return { 
          success: false, 
          error: 'Permission denied: RLS policy is blocking the update. Please ensure the SQL migration fix-folder-id-persistence.sql has been run. Error: ' + updateError.message
        };
      }
      
      return { success: false, error: updateError.message || 'Failed to update folder_id' };
    }
    
     console.log('📊 Update result:', {
       hasData: !!updateData,
       dataLength: Array.isArray(updateData) ? updateData.length : updateData ? 1 : 0,
       data: updateData
     });

     // Handle array response (when not using .single())
     const updatedFile = Array.isArray(updateData) ? (updateData.length > 0 ? updateData[0] : null) : updateData;

     // Verify the update was successful
     if (!updatedFile) {
       console.error('❌ CRITICAL: Update returned no data - RLS may be blocking the select after update');
       console.error('This usually means:');
       console.error('1. RLS policy is blocking SELECT after UPDATE');
       console.error('2. The update succeeded but you cannot read the updated row');
       console.error('3. Please check RLS policies in fix-folder-id-persistence.sql');
      console.error('❌ CRITICAL: Update returned no data - cannot verify folder_id was set');
      // Try to fetch the file again to see its current state
      const { data: verifyData, error: verifyError } = await supabase
        .from('data_items')
        .select('id, folder_id, title, type')
        .eq('id', normalizedFileId)
        .single();
      
      console.log('🔍 Verification query result:', {
        hasData: !!verifyData,
        data: verifyData,
        error: verifyError
      });
      
      if (verifyData) {
       console.log('📋 Current file state:', verifyData);
         if (verifyData.folder_id === normalizedFolderId) {
           console.log('✅ folder_id was actually set correctly, update succeeded');
           // Update succeeded even though select didn't return data (might be RLS issue)
         } else {
           console.error('❌ folder_id was NOT set. Current value:', verifyData.folder_id, 'Expected:', normalizedFolderId);
           return { 
             success: false, 
             error: 'File move failed: folder_id was not updated. Current value: ' + (verifyData.folder_id || 'null') + ', Expected: ' + (normalizedFolderId || 'null')
           };
         }
       } else {
         return { 
           success: false, 
           error: 'File move may have failed: Could not verify the update. Please check browser console for details.' 
         };
       }
     } else {
       // We have updateData (array or single object)
       console.log('✅ File moved successfully:', {
         fileId: updatedFile.id,
         fileTitle: updatedFile.title,
         fileType: updatedFile.type,
         folderId: updatedFile.folder_id,
         expectedFolderId: normalizedFolderId,
         match: updatedFile.folder_id === normalizedFolderId
       });
       
       if (updatedFile.folder_id !== normalizedFolderId) {
         console.error('❌ WARNING: folder_id update mismatch! Expected:', normalizedFolderId, 'Got:', updatedFile.folder_id);
         return { 
           success: false, 
           error: 'File move failed: folder_id was not updated correctly. Got: ' + (updatedFile.folder_id || 'null') + ', Expected: ' + (normalizedFolderId || 'null')
         };
       }
     }

    // Final verification: Fetch the file one more time to confirm folder_id is persisted
    console.log('🔍 Final verification: Fetching file from database...');
    const { data: finalVerify, error: finalError } = await supabase
      .from('data_items')
      .select('id, folder_id, title, type, updated_at')
      .eq('id', normalizedFileId)
      .single();
    
    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
    } else if (finalVerify) {
      console.log('✅ Final verification result:', {
        fileId: finalVerify.id,
        fileTitle: finalVerify.title,
        folderId: finalVerify.folder_id,
        expectedFolderId: normalizedFolderId,
        match: finalVerify.folder_id === normalizedFolderId,
        updatedAt: finalVerify.updated_at
      });
      
      if (finalVerify.folder_id !== normalizedFolderId) {
        console.error('❌ CRITICAL: folder_id was NOT persisted!', {
          expected: normalizedFolderId,
          actual: finalVerify.folder_id,
          typeExpected: typeof normalizedFolderId,
          typeActual: typeof finalVerify.folder_id
        });
        return { 
          success: false, 
          error: 'File move failed: folder_id was not persisted in database. Please check RLS policies and ensure the SQL migration was run correctly.' 
        };
      }
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

    console.log('✅✅✅ File move completed successfully and verified in database!');
    return { success: true };
  } catch (error) {
    console.error('Error moving file to folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move file to folder',
    };
  }
}

