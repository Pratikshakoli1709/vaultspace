import supabase from './supabaseClient';

export type BroadcastTarget = {
  id: string;
  name: string;
  email: string;
};

export type SendBroadcastParams = {
  title: string;
  message: string;
  senderId: string;
  recipients: string[];
};

export async function getEligibleBroadcastTargets(): Promise<BroadcastTarget[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Failed to load broadcast targets', error);
    return [];
  }

  return (data ?? [])
    .filter((profile) => profile.id)
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name ?? profile.email ?? 'User',
      email: profile.email ?? '',
    }));
}

export async function sendBroadcastNotification(params: SendBroadcastParams) {
  const { title, message, senderId, recipients } = params;

  const { error } = await supabase.from('notifications').insert(
    recipients.map((userId) => ({
      sender_id: senderId,
      receiver_id: userId,
      message: `${title}\n\n${message}`,
      type: 'personal',
      is_read: false,
    })),
  );

  if (error) {
    console.error('Broadcast notification failed', error);
    throw error;
  }
}

/**
 * Notify all admins about an event
 */
export async function notifyAllAdmins(message: string, senderId: string) {
  const { data: admins, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (fetchError) {
    console.error('Failed to fetch admins for notification', fetchError);
    return;
  }

  if (!admins || admins.length === 0) {
    return;
  }

  const adminIds = admins.map((admin) => admin.id).filter((id) => id !== senderId);

  if (adminIds.length === 0) {
    return;
  }

  const { error } = await supabase.from('notifications').insert(
    adminIds.map((adminId) => ({
      sender_id: senderId,
      receiver_id: adminId,
      message,
      type: 'personal',
      is_read: false,
    })),
  );

  if (error) {
    console.error('Failed to notify admins', error);
  }
}

/**
 * Notify a specific user
 * Similar to broadcast but for individual users
 */
export async function notifyUser(userId: string, message: string, senderId: string): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      sender_id: senderId,
      receiver_id: userId,
      message,
      type: 'personal',
      is_read: false,
    });

    if (error) {
      console.error('Failed to notify user', error);
      throw error;
    }
    
    console.log(`Notification sent to user ${userId}: ${message}`);
  } catch (error) {
    console.error('Error notifying user:', error);
    // Re-throw to allow caller to handle
    throw error;
  }
}

