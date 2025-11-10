import { User, DataItem, ActivityLog, Notification, DataItemType, UserRole } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? '';

const users: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    avatarUrl: getImage('avatar-alex'),
    role: 'admin' as UserRole,
    createdAt: '2024-07-20T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    avatarUrl: getImage('avatar-maria'),
    role: 'user' as UserRole,
    createdAt: '2024-07-21T11:30:00Z',
  },
  {
    id: 'user-3',
    name: 'Chen Wei',
    email: 'chen.w@example.com',
    avatarUrl: getImage('avatar-chen'),
    role: 'user' as UserRole,
    createdAt: '2024-07-22T09:00:00Z',
  },
  {
    id: 'user-4',
    name: 'Sarah Miller',
    email: 's.miller@example.com',
    avatarUrl: getImage('avatar-sarah'),
    role: 'user' as UserRole,
    createdAt: '2024-07-23T14:15:00Z',
  },
  {
    id: 'user-5',
    name: 'David Brown',
    email: 'd.brown@example.com',
    avatarUrl: getImage('avatar-david'),
    role: 'user' as UserRole,
    createdAt: '2024-07-24T16:45:00Z',
  }
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
    file_url: getImage('asset-logo-mockups'),
    created_by: 'user-2',
    created_at: '2024-07-29T16:45:00Z',
    updated_at: '2024-07-29T16:45:00Z',
  },
   {
    id: 'item-5',
    title: 'Q3 Financial Summary',
    type: 'document' as DataItemType,
    file_url: '/placeholder.pdf',
    created_by: 'user-1',
    created_at: '2024-07-30T11:00:00Z',
    updated_at: '2024-07-30T11:05:00Z',
  },
  {
    id: 'item-6',
    title: 'Customer Feedback Portal',
    type: 'link' as DataItemType,
    link_url: 'https://feedback.vaultspace.com',
    created_by: 'user-4',
    created_at: '2024-07-29T08:00:00Z',
    updated_at: '2024-07-29T08:00:00Z',
  },
  {
    id: 'item-7',
    title: 'Stripe API Key (Test)',
    type: 'key' as DataItemType,
    text_content: 'pk_test_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456',
    created_by: 'user-1',
    created_at: '2024-07-28T18:00:00Z',
    updated_at: '2024-07-28T18:00:00Z',
  },
  {
    id: 'item-8',
    title: 'Social Media Campaign Images',
    type: 'image' as DataItemType,
    file_url: getImage('asset-social-campaign'),
    created_by: 'user-5',
    created_at: '2024-07-30T14:00:00Z',
    updated_at: '2024-07-30T14:00:00Z',
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    user_id: 'user-5',
    action: 'UPLOADED',
    item_id: 'item-8',
    item_title: 'Social Media Campaign Images',
    timestamp: '2024-07-30T14:00:00Z',
  },
  {
    id: 'log-2',
    user_id: 'user-1',
    action: 'UPLOADED',
    item_id: 'item-5',
    item_title: 'Q3 Financial Summary',
    timestamp: '2024-07-30T11:00:00Z',
  },
  {
    id: 'log-3',
    user_id: 'user-2',
    action: 'UPLOADED',
    item_id: 'item-4',
    item_title: 'New Logo & Brand Guidelines',
    timestamp: '2024-07-29T16:45:00Z',
  },
  {
    id: 'log-4',
    user_id: 'user-4',
    action: 'VIEWED',
    item_id: 'item-3',
    item_title: 'OpenAI API Key (Production)',
    timestamp: '2024-07-29T11:05:00Z',
  },
  {
    id: 'log-5',
    user_id: 'user-1',
    action: 'EDITED',
    item_id: 'item-3',
    item_title: 'OpenAI API Key (Legacy)',
    timestamp: '2024-07-29T11:00:00Z',
  },
  {
    id: 'log-6',
    user_id: 'user-3',
    action: 'COPIED',
    item_id: 'item-3',
    item_title: 'OpenAI API Key (Production)',
    timestamp: '2024-07-29T10:55:00Z',
  },
  {
    id: 'log-7',
    user_id: 'user-3',
    action: 'UPLOADED',
    item_id: 'item-2',
    item_title: 'Staging Server Deployment URL',
    timestamp: '2024-07-27T14:30:00Z',
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
  {
    id: 'notif-2',
    sender_id: 'user-1',
    message: 'The new asset preview modal is now live. Click on any image or document to see it in action.',
    type: 'broadcast',
    is_read: true,
    timestamp: '2024-07-30T09:00:00Z',
  }
];


// In a real app, this would involve authentication and a database call.
// For this prototype, we'll just return the admin user.
export const getCurrentUser = (): User => users.find(u => u.role === 'admin')!;
// export const getCurrentUser = (): User => users.find(u => u.role === 'user')!;


export const getUsers = (): User[] => users;

export type EnrichedDataItem = DataItem & { uploader?: User };
export const getDataItemsWithUploader = (): EnrichedDataItem[] => {
  return dataItems.map(item => {
    const uploader = users.find(user => user.id === item.created_by);
    return { ...item, uploader };
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export type EnrichedActivityLog = ActivityLog & { user?: User };
export const getActivityLogsWithUser = (): EnrichedActivityLog[] => {
    return activityLogs.map(log => {
        const user = users.find(u => u.id === log.user_id);
        return { ...log, user };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export type EnrichedNotification = Notification & { sender_details?: User };
export const getNotifications = (): EnrichedNotification[] => {
  return notifications.map(notif => {
    const sender = users.find(u => u.id === notif.sender_id);
    return { ...notif, sender_details: sender };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
