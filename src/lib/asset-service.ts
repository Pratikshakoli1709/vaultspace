'use client';

import supabase from './supabaseClient';
import { mapRowToAsset, type DataItemRow } from './supabase-mappers';
import type { EnrichedDataItem, DataItemType, User } from './types';

const ASSET_BUCKET = 'vault';

export type UploadAssetParams = {
  title: string;
  type: DataItemType;
  linkUrl?: string | null;
  textContent?: string | null;
  file?: File | null;
  currentUser: User;
  sharedWithUserIds?: string[];
  teamId?: string | null;
};

export type UploadAssetResult =
  | { success: true; asset: EnrichedDataItem }
  | { success: false; error: string };

const sanitizeFileName = (name: string): string => {
  const normalized = name.normalize('NFKC');
  const parts = normalized.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const base = parts.join('.').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const safeBase = base.length > 0 ? base : 'file';
  return extension ? `${safeBase}.${extension.toLowerCase()}` : safeBase;
};

export async function uploadAssetClient(params: UploadAssetParams): Promise<UploadAssetResult> {
  const { title, type, linkUrl, textContent, file, currentUser, sharedWithUserIds = [], teamId } = params;

  // Verify team membership if teamId is provided
  if (teamId) {
    const { isTeamMember } = await import('./team-service');
    const isMember = await isTeamMember(currentUser.id, teamId);
    if (!isMember) {
      return { success: false, error: 'You are not a member of this team.' };
    }
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'Title is required.' };
  }

  if (type === 'link' && !(linkUrl && linkUrl.trim().length > 0)) {
    return { success: false, error: 'URL is required for link assets.' };
  }

  if (type === 'key' && !(textContent && textContent.trim().length > 0)) {
    return { success: false, error: 'Key value is required for key assets.' };
  }

  if ((type === 'document' || type === 'image') && !file) {
    return { success: false, error: 'A file must be selected for document and image assets.' };
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.name,
      avatar_url: currentUser.avatarUrl,
      role: currentUser.role,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('Failed to ensure uploader profile before asset upload', profileError);
    return { success: false, error: 'Unable to verify your account. Please try again.' };
  }

  let storagePath: string | null = null;
  let publicUrl: string | null = null;

  if ((type === 'document' || type === 'image') && file) {
    const uniqueName =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const safeFileName = sanitizeFileName(file.name);
    storagePath = `${currentUser.id}/${uniqueName}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      console.error('Failed to upload file to storage', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicData } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(storagePath);
    publicUrl = publicData?.publicUrl ?? null;
  }

  // Use direct insert if teamId is provided, otherwise use RPC
  let insertedId: string | undefined;
  
  if (teamId) {
    // For team documents, use RPC function first, then update with team fields
    // This avoids issues if team_id/visibility columns don't exist yet
    console.log('Creating team asset using RPC + update method');
    
    const { data: insertedIdData, error: rpcError } = await supabase.rpc<{ id: string }>(
      'create_data_item',
      {
        p_title: trimmedTitle,
        p_type: type,
        p_link_url: type === 'link' ? (linkUrl ?? '').trim() : null,
        p_text_content: type === 'key' ? (textContent ?? '').trim() : null,
        p_file_url: publicUrl,
        p_storage_path: storagePath,
      },
    );

    const rpcInsertedId =
      typeof insertedIdData === 'string'
        ? insertedIdData
        : Array.isArray(insertedIdData)
          ? insertedIdData[0]?.id
          : insertedIdData?.id;

    if (rpcError || !rpcInsertedId) {
      console.error('Failed to create asset via RPC:', rpcError);
      if (storagePath) {
        await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
      }
      return { success: false, error: rpcError?.message || 'Unable to create asset.' };
    }

    // Update with team_id and visibility (these updates will fail silently if columns don't exist)
    const updatePayload: Record<string, any> = {
      team_id: teamId,
      visibility: 'team',
    };

    console.log(`Updating asset ${rpcInsertedId} with team_id: ${teamId}`);

    // Try to update with team_id and visibility
    // Use a more robust approach: try update, if it fails check if columns exist
    let updateAttempted = false;
    let updateSucceeded = false;
    
    try {
      const { error: updateError, data: updateData } = await supabase
        .from('data_items')
        .update(updatePayload)
        .eq('id', rpcInsertedId)
        .select('team_id, visibility')
        .single();

      updateAttempted = true;

      if (updateError) {
        // Check if error is due to missing columns
        const isColumnError = updateError.message?.includes('column') || 
                             updateError.code === '42703' ||
                             updateError.message?.includes('does not exist');
        
        if (isColumnError) {
          console.error('CRITICAL: team_id or visibility columns do not exist in database!');
          console.error('Please run setup-teams-table.sql migration in Supabase SQL editor.');
          console.error('Error details:', {
            message: updateError.message,
            code: updateError.code,
            assetId: rpcInsertedId,
            teamId: teamId,
          });
          // Asset was created but won't be visible in team view without team_id
          return { 
            success: false, 
            error: 'File uploaded but team association failed. Please ensure team_id column exists in database.' 
          };
        } else {
          // Other error (permissions, etc.)
          console.error('Failed to set team_id/visibility:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            assetId: rpcInsertedId,
            teamId: teamId,
          });
          return { 
            success: false, 
            error: updateError.message || 'Failed to associate file with team.' 
          };
        }
      } else {
        updateSucceeded = true;
        console.log('Successfully set team_id and visibility for asset:', updateData);
        // Verify the update worked
        if (updateData?.team_id !== teamId) {
          console.error('WARNING: team_id update may have failed. Expected:', teamId, 'Got:', updateData?.team_id);
        }
      }
    } catch (updateException: any) {
      console.error('Exception during team_id update:', updateException);
      return { 
        success: false, 
        error: 'Failed to associate file with team: ' + (updateException.message || 'Unknown error')
      };
    }
    
    if (!updateSucceeded) {
      // If update failed, we should not proceed
      if (storagePath) {
        await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
      }
      return { 
        success: false, 
        error: 'Failed to associate file with team. File upload was cancelled.' 
      };
    }

    insertedId = rpcInsertedId;
  } else {
    // Use RPC for regular assets
    const { data: insertedIdData, error: insertError } = await supabase.rpc<{ id: string }>(
      'create_data_item',
      {
        p_title: trimmedTitle,
        p_type: type,
        p_link_url: type === 'link' ? (linkUrl ?? '').trim() : null,
        p_text_content: type === 'key' ? (textContent ?? '').trim() : null,
        p_file_url: publicUrl,
        p_storage_path: storagePath,
      },
    );

    insertedId =
      typeof insertedIdData === 'string'
        ? insertedIdData
        : Array.isArray(insertedIdData)
          ? insertedIdData[0]?.id
          : insertedIdData?.id;

    if (insertError || !insertedId) {
      console.error('Failed to insert asset', insertError);

      if (storagePath) {
        await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
      }

      return { success: false, error: insertError?.message ?? 'Unable to save asset.' };
    }
  }

  const { data, error } = await supabase
    .from('data_items')
    .select(
      `
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
          role,
          created_at
        ),
        asset_shares (
          user_id
        )
      `,
    )
    .eq('id', insertedId)
    .maybeSingle<DataItemRow>();
  
  // Log the fetched asset to verify team_id is set (for team uploads)
  if (data && teamId) {
    console.log('✅ Fetched asset after upload:', {
      id: data.id,
      title: data.title,
      team_id: data.team_id,
      expected_team_id: teamId,
      match: data.team_id === teamId,
      created_by: data.created_by
    });
    if (data.team_id !== teamId) {
      console.error('❌ WARNING: Asset team_id mismatch! Expected:', teamId, 'Got:', data.team_id);
    } else {
      console.log('✅ Asset team_id correctly set - all team members should be able to see this document');
    }
  }

  if (error || !data) {
    console.error('Failed to load inserted asset', error);

    return { success: false, error: error?.message ?? 'Unable to load asset.' };
  }

  if (sharedWithUserIds.length > 0) {
    const rows = sharedWithUserIds
      .filter((userId) => userId && userId !== currentUser.id)
      .map((userId) => ({ asset_id: data.id, user_id: userId }));

    if (rows.length > 0) {
      const { error: shareError } = await supabase.from('asset_shares').insert(rows);
      if (shareError) {
        console.error('Failed to record asset shares', shareError);
      }
    }
  }

  // Log activity (non-blocking - don't fail upload if logging fails)
  void logActivityClient({
    userId: currentUser.id,
    action: 'UPLOADED',
    itemId: data.id,
    itemTitle: trimmedTitle,
  }).catch((err) => {
    console.warn('Activity logging failed (non-critical):', err);
  });

  // Notify admins when any file is uploaded (if user is not admin)
  if (currentUser.role !== 'admin') {
    const { notifyAllAdmins } = await import('./notifications');
    await notifyAllAdmins(
      `File "${trimmedTitle}" (${type}) has been uploaded by ${currentUser.name || currentUser.email}`,
      currentUser.id,
    );
  }

  // Trigger AI processing in the background (non-blocking)
  if (textContent || type === 'document' || type === 'image') {
    void fetch('/api/ai/process-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: data.id,
        textContent: textContent || null,
        fileType: type,
      }),
    }).catch((error) => {
      console.warn('AI processing failed (non-critical):', error);
    });
  }

  return { success: true, asset: mapRowToAsset(data) };
}

export type DeleteAssetParams = {
  assetId: string;
  currentUser: User;
};

export type DeleteAssetResult = { success: true } | { success: false; error: string };

export type UpdateAssetParams = {
  assetId: string;
  title?: string;
  textContent?: string;
  linkUrl?: string;
  currentUser: User;
};

export type UpdateAssetResult =
  | { success: true; asset: EnrichedDataItem }
  | { success: false; error: string };

export async function updateAssetClient(params: UpdateAssetParams): Promise<UpdateAssetResult> {
  const { assetId, title, textContent, linkUrl, currentUser } = params;

  // Validate assetId is provided
  if (!assetId) {
    console.error('Failed to update asset: assetId is required');
    return { success: false, error: 'Asset ID is required.' };
  }

  const updateData: Record<string, unknown> = {
    updated_by: currentUser.id,
  };

  if (title !== undefined) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Title cannot be empty.' };
    }
    updateData.title = trimmedTitle;
  }

  if (textContent !== undefined) {
    updateData.text_content = textContent.trim() || null;
  }

  if (linkUrl !== undefined) {
    updateData.link_url = linkUrl.trim() || null;
  }

  const { data, error } = await supabase
    .from('data_items')
    .update(updateData)
    .eq('id', assetId)
    .select(
      `
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
        profiles:created_by (
          id,
          full_name,
          email,
          avatar_url,
          role,
          created_at
        ),
        asset_shares (
          user_id
        )
      `,
    )
    .maybeSingle<DataItemRow>();

  if (error) {
    console.error('Failed to update asset', assetId, error);
    return { success: false, error: error.message ?? 'Unable to update asset.' };
  }

  if (!data) {
    console.error('Failed to update asset: No data returned for assetId', assetId);
    return { success: false, error: 'Asset not found or you do not have permission to update it.' };
  }

  const mappedAsset = mapRowToAsset(data);

  // Log activity (non-blocking - don't fail update if logging fails)
  void logActivityClient({
    userId: currentUser.id,
    action: 'EDITED',
    itemId: data.id,
    itemTitle: data.title,
  }).catch((err) => {
    console.warn('Activity logging failed (non-critical):', err);
  });

  // Notify admins when any file is edited (if user is not admin)
  if (currentUser.role !== 'admin') {
    const { notifyAllAdmins } = await import('./notifications');
    await notifyAllAdmins(
      `File "${data.title}" (${data.type}) has been edited by ${currentUser.name || currentUser.email}`,
      currentUser.id,
    );
  }

  return { success: true, asset: mappedAsset };
}

export async function deleteAssetClient({
  assetId,
  currentUser,
}: DeleteAssetParams): Promise<DeleteAssetResult> {
  const { data: assetRow, error: fetchError } = await supabase
    .from('data_items')
    .select('storage_path, type, title')
    .eq('id', assetId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch asset before deletion', fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!assetRow) {
    return { success: false, error: 'Asset not found.' };
  }

  const { error: deleteError } = await supabase.from('data_items').delete().eq('id', assetId);

  if (deleteError) {
    console.error('Failed to delete asset', deleteError);
    return { success: false, error: deleteError.message };
  }

  if (assetRow.storage_path) {
    const { error: storageDeleteError } = await supabase.storage
      .from(ASSET_BUCKET)
      .remove([assetRow.storage_path]);

    if (storageDeleteError) {
      console.error('Failed to remove asset file from storage', storageDeleteError);
    }
  }

  // Notify admins when any file is deleted
    const { notifyAllAdmins } = await import('./notifications');
    await notifyAllAdmins(
    `File "${assetRow.title}" (${assetRow.type}) has been deleted by ${currentUser.name || currentUser.email}`,
      currentUser.id,
    );

  return { success: true };
}

export type LogActivityParams = {
  userId: string;
  action: 'UPLOADED' | 'EDITED' | 'VIEWED' | 'COPIED' | 'DELETED' | 'BROADCAST';
  itemId?: string;
  itemTitle?: string;
};

export async function logActivityClient({
  userId,
  action,
  itemId,
  itemTitle,
}: LogActivityParams): Promise<DeleteAssetResult> {
  try {
    // Validate required parameters
    if (!userId || !action) {
      console.warn('logActivityClient: Missing required parameters', { userId, action });
      return { success: false, error: 'Missing required parameters' };
    }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      item_id: itemId ?? null,
      item_title: itemTitle ?? null,
    });

    if (error) {
      // Log error with proper serialization - avoid logging empty objects
      const errorDetails: Record<string, unknown> = {
        message: error.message || 'Unknown error',
        code: error.code || 'unknown',
        userId: userId || 'unknown',
        action: action || 'unknown',
      };
      
      if (error.details) errorDetails.details = error.details;
      if (error.hint) errorDetails.hint = error.hint;
      if (itemId) errorDetails.itemId = itemId;
      
      console.error('Failed to log activity:', JSON.stringify(errorDetails, null, 2));
      return { success: false, error: error.message || 'Failed to log activity' };
    }

    return { success: true };
  } catch (err) {
    // Handle unexpected errors gracefully
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorDetails = {
      error: errorMessage,
      userId: userId || 'unknown',
      action: action || 'unknown',
      itemId: itemId || null,
    };
    console.error('Failed to log activity - unexpected error:', JSON.stringify(errorDetails, null, 2));
    return { success: false, error: errorMessage };
  }
}

