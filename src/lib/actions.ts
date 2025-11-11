'use server'

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

// NOTE: This is a stubbed version for UI preview purposes. It does not actually save data.
export async function uploadAsset(formData: FormData): Promise<FormState> {
  const created_by = formData.get('created_by') as string;
  if (!created_by) {
      return { success: false, error: 'User must be logged in to upload an asset.' };
  }

  // Simulate success without database interaction
  await logActivity({
      user_id: created_by,
      action: 'UPLOADED',
      item_title: formData.get('title') as string
  })

  revalidatePath('/dashboard');
  return { success: true };
}


// NOTE: This is a stubbed version for UI preview purposes. It does not actually delete data.
export async function deleteAsset(assetId: string) {
    console.log(`Simulating delete for assetId: ${assetId}`);
    
    revalidatePath('/dashboard');
    return { success: true };
}

interface ActivityLogPayload {
    user_id: string;
    action: 'UPLOADED' | 'EDITED' | 'VIEWED' | 'COPIED' | 'DELETED' | 'BROADCAST';
    item_id?: string;
    item_title?: string;
}

// NOTE: This is a stubbed version for UI preview purposes. It does not actually log data.
export async function logActivity(payload: ActivityLogPayload) {
    console.log('Simulating activity log:', payload);
    revalidatePath('/dashboard');
    return { success: true };
}
