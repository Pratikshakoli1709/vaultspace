'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AssetSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['document', 'link', 'key', 'image']),
  link_url: z.string().url().optional().or(z.literal('')),
  text_content: z.string().optional(),
  file_url: z.string().url().optional().nullable(),
  created_by: z.string(),
});

type FormState = {
  success: boolean;
  error?: string;
}

export async function uploadAsset(formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const type = formData.get('type') as 'document' | 'link' | 'key' | 'image';
  const created_by = formData.get('created_by') as string;
  const title = formData.get('title') as string;
  let fileUrl: string | null = null;
  
  if (!created_by) {
      return { success: false, error: 'User must be logged in to upload an asset.' };
  }

  // 1. Handle file upload first, if applicable
  if (type === 'image' || type === 'document') {
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      return { success: false, error: 'A file is required for this asset type.' };
    }

    const filePath = `${created_by}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return { success: false, error: 'Database error: Could not upload file.' };
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
    fileUrl = urlData.publicUrl;
  }
  
  // 2. Prepare data for validation
  const dataToValidate = {
    title: title,
    type: type,
    link_url: formData.get('link_url'),
    text_content: formData.get('text_content'),
    file_url: fileUrl,
    created_by: created_by,
  };

  // 3. Validate the complete data object
  const validatedFields = AssetSchema.safeParse(dataToValidate);
  
  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten());
    // If validation fails, attempt to delete the orphaned file from storage
    if (fileUrl) {
      const filePath = fileUrl.split('/assets/')[1];
      await supabase.storage.from('assets').remove([filePath]);
    }
    return {
      success: false,
      error: 'Invalid data submitted. Please check your inputs.',
    };
  }

  // 4. Insert validated data into the database
  const { data, error } = await supabase
    .from('data_items')
    .insert([validatedFields.data])
    .select()
    .single();

  if (error) {
    console.error('Supabase Insert Error:', error);
     if (fileUrl) {
      const filePath = fileUrl.split('/assets/')[1];
      await supabase.storage.from('assets').remove([filePath]);
    }
    return { success: false, error: 'Database error: Could not save asset metadata.' };
  }

  // 5. Log activity
  await logActivity({
      user_id: validatedFields.data.created_by,
      action: 'UPLOADED',
      item_id: data.id,
      item_title: data.title
  })

  revalidatePath('/dashboard');
  return { success: true };
}


export async function deleteAsset(assetId: string) {
    const supabase = createClient();
    const { data: asset } = await supabase.from('data_items').select('file_url').eq('id', assetId).single();

    const { error } = await supabase.from('data_items').delete().eq('id', assetId);

    if (error) {
        console.error('Supabase delete error:', error);
        return { success: false, error: 'Database error: Could not delete asset.' };
    }

    // If asset was a file, delete it from storage as well
    if (asset?.file_url) {
        try {
            const filePath = asset.file_url.split('/assets/')[1];
            await supabase.storage.from('assets').remove([filePath]);
        } catch (storageError) {
            console.error("Could not delete from storage, but DB record was removed:", storageError);
        }
    }
    
    revalidatePath('/dashboard');
    return { success: true };
}

interface ActivityLogPayload {
    user_id: string;
    action: 'UPLOADED' | 'EDITED' | 'VIEWED' | 'COPIED' | 'DELETED' | 'BROADCAST';
    item_id?: string;
    item_title?: string;
}

export async function logActivity(payload: ActivityLogPayload) {
    const supabase = createClient();
    const { error } = await supabase.from('activity_logs').insert([payload]);
    
    if (error) {
        console.error('Error logging activity:', error);
    } else {
        revalidatePath('/dashboard');
    }
}