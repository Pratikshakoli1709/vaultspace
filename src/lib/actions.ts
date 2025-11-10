
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

  // Handle file upload if asset is an image or document
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
      console.error('Supabase Upload Error:', uploadError);
      return { success: false, error: 'Database error: Could not upload file.' };
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
    fileUrl = urlData.publicUrl;
  }
  
  const validatedFields = AssetSchema.safeParse({
    title: title,
    type: type,
    link_url: formData.get('link_url'),
    text_content: formData.get('text_content'),
    file_url: fileUrl,
    created_by: created_by,
  });
  
  if (!validatedFields.success) {
    console.error("Validation Error:", validatedFields.error.flatten());
    return {
      success: false,
      error: 'Invalid data.',
    };
  }

  const { data, error } = await supabase
    .from('data_items')
    .insert([validatedFields.data])
    .select()
    .single();

  if (error) {
    console.error('Supabase Insert Error:', error);
    return { success: false, error: 'Database error: Could not save asset metadata.' };
  }

  // Log activity
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
    const { error } = await supabase.from('data_items').delete().eq('id', assetId);

    if (error) {
        console.error('Supabase delete error:', error);
        return { success: false, error: 'Database error: Could not delete asset.' };
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
