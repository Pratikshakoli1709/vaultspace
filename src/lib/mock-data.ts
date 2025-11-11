
import { User, DataItem, ActivityLog, Notification, DataItemType, UserRole } from './types';

const MOCK_USERS: User[] = [
    {
      id: 'user-1',
      name: 'Alex Johnson',
      email: 'alex.j@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
      role: 'admin',
      createdAt: '2024-07-20T10:00:00Z',
    },
    {
      id: 'user-2',
      name: 'Maria Garcia',
      email: 'maria.g@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
      role: 'user',
      createdAt: '2024-07-21T11:30:00Z',
    },
    {
      id: 'user-3',
      name: 'Chen Wei',
      email: 'chen.w@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?u=user-3',
      role: 'user',
      createdAt: '2024-07-22T09:15:00Z',
    },
     {
      id: 'user-4',
      name: 'Sarah Miller',
      email: 'sarah.m@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?u=user-4',
      role: 'user',
      createdAt: '2024-07-22T14:00:00Z',
    },
    {
      id: 'user-5',
      name: 'David Brown',
      email: 'david.b@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?u=user-5',
      role: 'user',
      createdAt: '2024-07-23T08:00:00Z',
    },
];

const MOCK_DATA_ITEMS: DataItem[] = [
  {
    id: 'item-1',
    title: 'Q3 Financial Report',
    type: 'document',
    file_url: '/placeholder.pdf',
    created_by: 'user-1',
    created_at: '2024-07-28T10:00:00Z',
    updated_at: '2024-07-28T10:00:00Z',
  },
  {
    id: 'item-2',
    title: 'Production API Key - OpenAI',
    type: 'key',
    text_content: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    created_by: 'user-1',
    created_at: '2024-07-27T15:30:00Z',
    updated_at: '2024-07-27T15:30:00Z',
  },
  {
    id: 'item-3',
    title: 'New Logo Mockups',
    type: 'image',
    file_url: 'https://picsum.photos/seed/1/1200/800',
    created_by: 'user-2',
    created_at: '2024-07-26T11:45:00Z',
    updated_at: '2024-07-26T11:45:00Z',
  },
  {
    id: 'item-4',
    title: 'Project Phoenix GitHub Repo',
    type: 'link',
    link_url: 'https://github.com',
    created_by: 'user-3',
    created_at: '2024-07-25T09:00:00Z',
    updated_at: '2024-07-25T09:00:00Z',
  },
  {
    id: 'item-5',
    title: 'Social Media Campaign Images',
    type: 'image',
    file_url: 'https://picsum.photos/seed/2/1200/800',
    created_by: 'user-2',
    created_at: '2024-07-24T18:00:00Z',
    updated_at: '2024-07-24T18:00:00Z',
  },
];

const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'log-1', user_id: 'user-1', item_id: 'item-1', action: 'UPLOADED', item_title: 'Q3 Financial Report', timestamp: '2024-07-28T10:00:00Z' },
  { id: 'log-2', user_id: 'user-2', item_id: 'item-1', action: 'VIEWED', item_title: 'Q3 Financial Report', timestamp: '2024-07-28T10:05:00Z' },
  { id: 'log-3', user_id: 'user-1', item_id: 'item-2', action: 'UPLOADED', item_title: 'Production API Key - OpenAI', timestamp: '2024-07-27T15:30:00Z' },
  { id: 'log-4', user_id: 'user-3', item_id: 'item-2', action: 'COPIED', item_title: 'Production API Key - OpenAI', timestamp: '2024-07-27T15:32:00Z' },
  { id: 'log-5', user_id: 'user-2', item_id: 'item-3', action: 'UPLOADED', item_title: 'New Logo Mockups', timestamp: '2024-07-26T11:45:00Z' },
];

const MOCK_NOTIFICATIONS: Notification[] = [
    { 
        id: 'notif-1', 
        sender_id: 'system',
        message: 'Scheduled maintenance is planned for this Sunday at 2 AM UTC.',
        type: 'broadcast',
        is_read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
    },
    { 
        id: 'notif-2', 
        sender_id: 'user-1',
        receiver_id: 'user-2',
        message: 'Please review the Q3 financial report I just uploaded.',
        type: 'personal',
        is_read: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    },
    { 
        id: 'notif-3', 
        sender_id: 'system',
        message: 'A new security policy has been implemented. Please review the documentation.',
        type: 'broadcast',
        is_read: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
];

export const getMockUsers = (): User[] => MOCK_USERS;
export const getMockDataItems = (): DataItem[] => MOCK_DATA_ITEMS;
export const getMockActivityLogs = (): ActivityLog[] => MOCK_ACTIVITY_LOGS;
export const getMockNotifications = (): Notification[] => MOCK_NOTIFICATIONS;
