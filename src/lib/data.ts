import { User, DataItem, ActivityLog, Notification, DataItemType, UserRole } from './types';
import { createClient } from './supabase/server';

// NOTE: This mock data is for UI prototyping.
// It does not interact with the Supabase database.

const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
    role: 'admin' as UserRole,
    createdAt: '2024-07-20T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
    role: 'user' as UserRole,
    createdAt: '2024-07-21T11:30:00Z',
  },
  {
    id: 'user-3',
    name: 'Chen Wei',
    email: 'chen.w@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-3',
    role: 'user' as UserRole,
    createdAt: '2024-07-22T09:00:00Z',
  },
];

const dataItems: DataItem[] = [
  {
    id: 'item-1',
    title: 'Project Phoenix Launch Plan Q4',
    type: 'document' as DataItemType,
    file_url: '/placeholder.pdf',
    created_by: 'user-2',
    created_at: '2024-07-28T10:00:00Z',
    updated_at: '2024-07-28T10:00:00Z',
  },
  {
    id: 'item-2',
    title: 'Staging Server Deployment URL',
    type: 'link' as DataItemType,
    link_url: 'https://staging.vaultspace.dev',
    created_by: 'user-3',
    created_at: '2024-07-27T14:30:00Z',
    updated_at: '2024-07-27T14:30:00Z',
  },
  {
    id: 'item-3',
    title: 'OpenAI API Key (Production)',
    type: 'key' as DataItemType,
    text_content: 'sk-d9f2j8wS7qA3xZvB6nK4tGbLpY1oHcR5eIuF0',
    created_by: 'user-1',
    updated_by: 'user-1',
    created_at: '2024-07-25T09:15:00Z',
    updated_at: '2024-07-29T11:00:00Z',
  },
  {
    id: 'item-4',
    title: 'New Logo & Brand Guidelines',
    type: 'image' as DataItemType,
    file_url: 'https://picsum.photos/seed/brand-guidelines/800/600',
    created_by: 'user-2',
    created_at: '2024-07-29T16:45:00Z',
    updated_at: '2024-07-29T16:45:00Z',
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    user_id: 'user-2',
    action: 'UPLOADED',
    item_id: 'item-4',
    item_title: 'New Logo & Brand Guidelines',
    timestamp: '2024-07-29T16:45:00Z',
  },
  {
    id: 'log-2',
    user_id: 'user-1',
    action: 'EDITED',
    item_id: 'item-3',
    item_title: 'OpenAI API Key (Production)',
    timestamp: '2024-07-29T11:00:00Z',
  },
];

const notifications: Notification[] = [
  {
    id: 'notif-1',
    sender_id: 'user-1',
    message: 'Scheduled maintenance for staging servers this Friday at 10 PM PST.',
    type: 'broadcast',
    is_read: false,
    timestamp: '2024-07-29T18:00:00Z',
  },
];

// This function now fetches all profiles from your Supabase 'profiles' table.
export const getUsers = async (): Promise<User[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
    return mockUsers; // Fallback to mock data on error
  }

  // Map Supabase profile data to the User type
  return data.map(profile => ({
    id: profile.id,
    name: profile.full_name || 'No Name',
    email: 'not-available', // Email is in auth.users, not profiles table
    avatarUrl: profile.avatar_url || `https://i.pravatar.cc/150?u=${profile.id}`,
    role: profile.role || 'user',
    createdAt: profile.created_at,
  }));
};

export type EnrichedDataItem = DataItem & { uploader?: User };
export const getDataItemsWithUploader = (): EnrichedDataItem[] => {
  return dataItems.map(item => {
    const uploader = mockUsers.find(user => user.id === item.created_by);
    return { ...item, uploader };
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export type EnrichedActivityLog = ActivityLog & { user?: User };
export const getActivityLogsWithUser = (): EnrichedActivityLog[] => {
    return activityLogs.map(log => {
        const user = mockUsers.find(u => u.id === log.user_id);
        return { ...log, user };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export type EnrichedNotification = Notification & { sender_details?: User };
export const getNotifications = (): EnrichedNotification[] => {
  return notifications.map(notif => {
    const sender = mockUsers.find(u => u.id === notif.sender_id);
    return { ...notif, sender_details: sender };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
