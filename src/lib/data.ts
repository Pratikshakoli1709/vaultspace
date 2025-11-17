
import supabase from './supabaseClient';
import {
  mapProfileRowToUser,
  mapRowToActivityLog,
  mapRowToAsset,
  type ActivityLogRow,
  type DataItemRow,
  type ProfileRow,
} from './supabase-mappers';
import {
  getMockActivityLogs,
  getMockDataItems,
  getMockNotifications,
  getMockUsers,
} from './mock-data';
import type {
  EnrichedActivityLog,
  EnrichedDataItem,
  EnrichedNotification,
  User,
} from './types';

type NotificationRow = {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  message: string;
  type: 'broadcast' | 'personal';
  is_read: boolean;
  timestamp: string;
  profiles?: ProfileRow | null;
};

const profilesSelect =
  'id, full_name, email, avatar_url, role, created_at';

export const getRealUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select<ProfileRow>(profilesSelect)
    .order('full_name', { ascending: true, nullsFirst: true });

  if (error) {
    console.warn('Falling back to mock users due to Supabase error:', error.message);
  return getMockUsers();
  }

  return (data ?? []).map(mapProfileRowToUser);
};

export const getRealDataItems = async (): Promise<EnrichedDataItem[]> => {
  const { data, error } = await supabase
    .from('data_items')
    .select<DataItemRow>(
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
          ${profilesSelect}
        )
      `,
    )
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Falling back to mock data items due to Supabase error:', error.message);
  const users = getMockUsers();
    const userMap = new Map(users.map((user) => [user.id, user]));
    return getMockDataItems().map((item) => ({
    ...item,
    uploader: userMap.get(item.created_by),
  }));
  }

  return (data ?? []).map(mapRowToAsset);
};

export const getRealActivityLogs = async (): Promise<EnrichedActivityLog[]> => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select<ActivityLogRow>(
      `
        id,
        user_id,
        item_id,
        action,
        item_title,
        timestamp,
        profiles:user_id (
          ${profilesSelect}
        )
      `,
    )
    .order('timestamp', { ascending: false });

  if (error) {
    console.warn('Falling back to mock activity logs due to Supabase error:', error.message);
    const users = getMockUsers();
    const userMap = new Map(users.map((user) => [user.id, user]));
    return getMockActivityLogs().map((log) => ({
      ...log,
      user: userMap.get(log.user_id),
    }));
  }

  return (data ?? []).map(mapRowToActivityLog);
};

export const getNotifications = async (userId?: string): Promise<EnrichedNotification[]> => {
  let query = supabase
    .from('notifications')
    .select<NotificationRow>(
      `
        id,
        sender_id,
        receiver_id,
        message,
        type,
        is_read,
        timestamp,
        profiles:sender_id (
          ${profilesSelect}
        )
      `,
    )
    .order('timestamp', { ascending: false });

  if (userId) {
    query = query.or(`receiver_id.eq.${userId},type.eq.broadcast`);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('Falling back to mock notifications due to Supabase error:', error.message);
    const users = getMockUsers();
    const userMap = new Map(users.map((user) => [user.id, user]));
    return getMockNotifications()
      .map((notif) => ({
        ...notif,
        sender_details: notif.sender_id ? userMap.get(notif.sender_id) : undefined,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

  return (data ?? []).map((row) => {
    const sender = row.profiles ? mapProfileRowToUser(row.profiles) : undefined;
    return {
      id: row.id,
      sender_id: row.sender_id ?? 'system',
      receiver_id: row.receiver_id ?? undefined,
      message: row.message,
      type: row.type,
      is_read: row.is_read,
      timestamp: row.timestamp,
      sender_details: sender,
    };
  });
};
