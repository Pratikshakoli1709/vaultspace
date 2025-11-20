'use client';

import supabase from './supabaseClient';
import { notifyAllAdmins } from './notifications';
import { uploadAssetClient } from './asset-service';
import type { FileVersion, FileWithVersions, User, EnrichedDataItem } from './types';

const ASSET_BUCKET = 'vault';

/**
 * Get all versions for a file
 */
export async function getFileVersions(fileId: string): Promise<FileVersion[]> {
  try {
  const { data, error } = await supabase
    .from('file_versions')
    .select('*')
    .eq('file_id', fileId)
    .order('version_number', { ascending: false });

  if (error) {
      // If table doesn't exist, return empty array gracefully
      if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.warn('file_versions table does not exist. Please run setup-versions-table.sql migration.');
        return [];
      }
    console.error('Failed to fetch file versions:', error);
    return [];
  }

  // Enrich with user names
  const versionsWithNames = await Promise.all(
    (data || []).map(async (version) => {
      let uploadedByName = 'Unknown';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', version.uploaded_by)
          .maybeSingle();
        
        uploadedByName = profile?.full_name || profile?.email || 'Unknown';
      } catch (error) {
        console.warn('Failed to fetch profile for version:', error);
      }

      return {
        id: version.id,
        fileId: version.file_id,
        versionNumber: version.version_number,
        uploadedBy: version.uploaded_by,
        uploadedByName,
        timestamp: version.created_at,
        fileUrl: version.file_url,
        storagePath: version.storage_path,
        size: version.size,
        changelog: version.changelog,
        diff: version.diff,
      } as FileVersion;
    })
  );

  return versionsWithNames;
  } catch (error) {
    console.error('Unexpected error in getFileVersions:', error);
    return [];
  }
}

/**
 * Upload a new version of an existing file
 */
export async function uploadNewVersion({
  fileId,
  file,
  textContent,
  changelog,
  currentUser,
}: {
  fileId: string;
  file?: File | null;
  textContent?: string;
  changelog?: string;
  currentUser: User;
}): Promise<{ success: boolean; error?: string; newVersion?: FileVersion }> {
  try {
    // Get current file info
    const { data: currentFile, error: fetchError } = await supabase
      .from('data_items')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (fetchError || !currentFile) {
      return { success: false, error: 'File not found' };
    }

    // Get current version number
    // Check if any versions exist first
    const { data: existingVersions } = await supabase
      .from('file_versions')
      .select('version_number')
      .eq('file_id', fileId)
      .order('version_number', { ascending: false })
      .limit(1);
    
    // If no versions exist, start at version 1, otherwise increment
    const currentVersion = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number
      : (currentFile.current_version || 0);
    const newVersionNumber = currentVersion + 1;

    // Upload new file if provided
    let newFileUrl: string | null = null;
    let newStoragePath: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      // For document/image files, upload the new file
      const uniqueName =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      const sanitizedFileName = `${currentUser.id}/${uniqueName}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(ASSET_BUCKET)
        .upload(sanitizedFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      newStoragePath = uploadData.path;
      const { data: urlData } = supabase.storage
        .from(ASSET_BUCKET)
        .getPublicUrl(newStoragePath);
      newFileUrl = urlData.publicUrl;
      fileSize = file.size;
    } else {
      // If no new file, use existing file URL
      newFileUrl = currentFile.file_url;
      newStoragePath = currentFile.storage_path;
    }

    // Calculate diff and store text content for key files
    let diff: string | null = null;
    if (currentFile.type === 'key' && textContent !== undefined) {
      // For key files, store the text content in diff field for restoration
      // Format: "KEY_CONTENT:<actual content>"
      const oldContent = currentFile.text_content || '';
      const newContent = textContent;
      if (oldContent !== newContent) {
        // Store the new text content in diff field for key files
        // This allows us to restore the exact key value later
        diff = `KEY_CONTENT:${newContent}`;
      } else {
        // Even if unchanged, store it for consistency
        diff = `KEY_CONTENT:${newContent}`;
      }
    } else if (currentFile.type === 'document' && file) {
      // For document files with new file upload
      diff = `[File updated in version ${newVersionNumber}]`;
    }

    // Create version record
    const { data: versionData, error: versionError } = await supabase
      .from('file_versions')
      .insert({
        file_id: fileId,
        version_number: newVersionNumber,
        uploaded_by: currentUser.id,
        file_url: newFileUrl,
        storage_path: newStoragePath,
        size: fileSize,
        changelog: changelog || null,
        diff: diff || null,
      })
      .select()
      .maybeSingle();

    if (versionError) {
      // Check if table doesn't exist
      if (versionError.code === '42P01' || versionError.code === 'PGRST116' || versionError.message?.includes('does not exist')) {
        return { 
          success: false, 
          error: 'Version history table does not exist. Please run setup-versions-table.sql migration in Supabase.' 
        };
      }
      return { success: false, error: versionError.message || 'Failed to create version' };
    }

    if (!versionData) {
      return { success: false, error: 'Failed to create version - no data returned' };
    }

    // Update main file record
    const updateData: Record<string, unknown> = {
      current_version: newVersionNumber,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.id,
    };

    // Update file URL and storage path if new file was uploaded
    if (file && newFileUrl) {
      updateData.file_url = newFileUrl;
    }
    if (file && newStoragePath) {
      updateData.storage_path = newStoragePath;
    }
    
    // Update text content for key files
    if (textContent !== undefined && currentFile.type === 'key') {
      updateData.text_content = textContent;
    }

    const { error: updateError } = await supabase
      .from('data_items')
      .update(updateData)
      .eq('id', fileId);

    if (updateError) {
      console.error('Failed to update file:', updateError);
    }

    // Enrich version with user name
    let uploadedByName = currentUser.name || 'Unknown';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', currentUser.id)
        .maybeSingle();
      
      uploadedByName = profile?.full_name || profile?.email || currentUser.name || 'Unknown';
    } catch (error) {
      console.warn('Failed to fetch profile for version:', error);
    }

    const enrichedVersion: FileVersion = {
      id: versionData.id,
      fileId: versionData.file_id,
      versionNumber: versionData.version_number,
      uploadedBy: versionData.uploaded_by,
      uploadedByName,
      timestamp: versionData.created_at,
      fileUrl: versionData.file_url,
      storagePath: versionData.storage_path,
      size: versionData.size,
      changelog: versionData.changelog,
      diff: versionData.diff,
    };

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `User ${currentUser.name} updated file "${currentFile.title}" to version ${newVersionNumber}`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about version upload:', error);
      });
    }

    return { success: true, newVersion: enrichedVersion };
  } catch (error) {
    console.error('Error uploading new version:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload version',
    };
  }
}

/**
 * Restore a previous version
 */
export async function restoreVersion({
  fileId,
  versionNumber,
  currentUser,
}: {
  fileId: string;
  versionNumber: number;
  currentUser: User;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the version to restore
    const { data: version, error: versionError } = await supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .eq('version_number', versionNumber)
      .maybeSingle();

    if (versionError || !version) {
      return { success: false, error: 'Version not found' };
    }

    // Get current file info
    const { data: currentFile, error: fileError } = await supabase
      .from('data_items')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError || !currentFile) {
      return { success: false, error: 'File not found' };
    }

    // Get the highest version number to determine next version
    const { data: existingVersions } = await supabase
      .from('file_versions')
      .select('version_number')
      .eq('file_id', fileId)
      .order('version_number', { ascending: false })
      .limit(1);
    
    const currentVersion = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version_number
      : (currentFile.current_version || 0);
    const newVersionNumber = currentVersion + 1;

    // Create a new version from the restored one
    const { error: restoreError } = await supabase
      .from('file_versions')
      .insert({
        file_id: fileId,
        version_number: newVersionNumber,
        uploaded_by: currentUser.id,
        file_url: version.file_url,
        storage_path: version.storage_path,
        size: version.size,
        changelog: `Restored from version ${versionNumber}`,
        diff: version.diff,
      });

    if (restoreError) {
      return { success: false, error: restoreError.message };
    }

    // Extract text content from diff if it's a key file
    let restoredTextContent: string | undefined = undefined;
    if (currentFile.type === 'key' && version.diff && version.diff.startsWith('KEY_CONTENT:')) {
      restoredTextContent = version.diff.replace('KEY_CONTENT:', '');
    }

    // Update main file record
    const updateData: Record<string, unknown> = {
        current_version: newVersionNumber,
        file_url: version.file_url,
        storage_path: version.storage_path,
        updated_at: new Date().toISOString(),
        updated_by: currentUser.id,
    };

    // Restore text content for key files
    if (restoredTextContent !== undefined) {
      updateData.text_content = restoredTextContent;
    }

    const { error: updateError } = await supabase
      .from('data_items')
      .update(updateData)
      .eq('id', fileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Notify admins
    if (currentUser.role !== 'admin') {
      void notifyAllAdmins(
        `User ${currentUser.name} restored version ${versionNumber} of file "${currentFile.title}"`,
        currentUser.id
      ).catch((error) => {
        console.warn('Failed to notify admins about version restore:', error);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring version:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore version',
    };
  }
}

/**
 * Get file content for diff comparison (for text files)
 */
export async function getFileContentForDiff(
  fileId: string,
  versionNumber: number
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const { data: version, error } = await supabase
      .from('file_versions')
      .select('file_url, diff')
      .eq('file_id', fileId)
      .eq('version_number', versionNumber)
      .maybeSingle();

    if (error || !version) {
      return { success: false, error: 'Version not found' };
    }

    // For text files, try to fetch content
    if (version.file_url) {
      try {
        const response = await fetch(version.file_url);
        const content = await response.text();
        return { success: true, content };
      } catch (fetchError) {
        // If fetch fails, return diff if available
        return { success: true, content: version.diff || '' };
      }
    }

    return { success: true, content: version.diff || '' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file content',
    };
  }
}

