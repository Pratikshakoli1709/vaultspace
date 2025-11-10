'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating key rotation notifications.
 *
 * - generateKeyRotationNotification - A function that generates a draft notification for key rotation.
 * - KeyRotationNotificationInput - The input type for the generateKeyRotationNotification function.
 * - KeyRotationNotificationOutput - The return type for the generateKeyRotationNotification function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const KeyRotationNotificationInputSchema = z.object({
  apiKeyType: z.string().describe('The type of API key that needs rotation (e.g., OpenAI, Google Cloud).'),
  affectedUsers: z.string().describe('A comma-separated list of usernames or team names affected by the key rotation.'),
  rotationDeadline: z.string().describe('The deadline for rotating the API key (e.g., YYYY-MM-DD).'),
});
export type KeyRotationNotificationInput = z.infer<typeof KeyRotationNotificationInputSchema>;

const KeyRotationNotificationOutputSchema = z.object({
  notificationDraft: z.string().describe('A draft notification message for informing users about key rotation.'),
});
export type KeyRotationNotificationOutput = z.infer<typeof KeyRotationNotificationOutputSchema>;

export async function generateKeyRotationNotification(input: KeyRotationNotificationInput): Promise<KeyRotationNotificationOutput> {
  return keyRotationNotificationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'keyRotationNotificationPrompt',
  input: {schema: KeyRotationNotificationInputSchema},
  output: {schema: KeyRotationNotificationOutputSchema},
  prompt: `You are an AI assistant specializing in generating notification messages for IT administrators.

  Your task is to create a clear and concise notification for users who need to rotate their API keys.
  The notification should include the type of API key, the users affected, and the rotation deadline. It should also briefly explain why key rotation is important.

  Here are the details:
  API Key Type: {{{apiKeyType}}}
  Affected Users: {{{affectedUsers}}}
  Rotation Deadline: {{{rotationDeadline}}}

  Generate a notification message that is professional and easy to understand.`,
});

const keyRotationNotificationFlow = ai.defineFlow(
  {
    name: 'keyRotationNotificationFlow',
    inputSchema: KeyRotationNotificationInputSchema,
    outputSchema: KeyRotationNotificationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
