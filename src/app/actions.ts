'use server';

import { generateKeyRotationNotification } from '@/ai/flows/key-rotation-notification';
import { z } from 'zod';

const KeyRotationNotificationInputSchema = z.object({
  apiKeyType: z.string().min(1, 'API Key Type is required.'),
  affectedUsers: z.string().min(1, 'Affected Users are required.'),
  rotationDeadline: z.string().min(1, 'Rotation Deadline is required.'),
});

type FormState = {
  message: 'success' | 'error' | 'idle';
  data?: { notificationDraft: string };
  errors?: Record<string, string[] | undefined>;
}

export async function handleGenerateNotification(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = KeyRotationNotificationInputSchema.safeParse({
    apiKeyType: formData.get('apiKeyType'),
    affectedUsers: formData.get('affectedUsers'),
    rotationDeadline: formData.get('rotationDeadline'),
  });

  if (!validatedFields.success) {
    return {
      message: 'error',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateKeyRotationNotification(validatedFields.data);
    return { message: 'success', data: result };
  } catch (error) {
    console.error(error);
    return { message: 'error', errors: { _form: ['An unexpected error occurred.'] } };
  }
}
