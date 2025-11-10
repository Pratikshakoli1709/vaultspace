
'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AssetSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['document', 'link', 'key', 'image']),
  link_url: z.string().optional(),
  text_content: z.string().optional(),
  file_url: z.string().optional(),
  created_by: z.string(),
});

type FormState = {
  success: boolean;
  error?: string;
}

export async function uploadAsset(formData: FormData): Promise<FormState> {
  const validatedFields = AssetSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    link_url: formData.get('link_url'),
    text_content: formData.get('text_content'),
    file_url: formData.get('file_url'),
    created_by: formData.get('created_by'),
  });
  
  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors.title?.[0] || 'Invalid data.',
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('data_items')
    .insert([validatedFields.data])
    .select()
    .single();

  if (error) {
    console.error('Supabase Error:', error);
    return { success: false, error: 'Database error: Could not upload asset.' };
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
