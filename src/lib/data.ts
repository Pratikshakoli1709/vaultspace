import { User, Asset, ActivityLog } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? '';

const users: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    avatarUrl: getImage('avatar-alex'),
    role: 'admin',
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    avatarUrl: getImage('avatar-maria'),
    role: 'user',
  },
  {
    id: 'user-3',
    name: 'Chen Wei',
    email: 'chen.w@example.com',
    avatarUrl: getImage('avatar-chen'),
    role: 'user',
  },
    {
    id: 'user-4',
    name: 'Sarah Miller',
    email: 's.miller@example.com',
    avatarUrl: getImage('avatar-sarah'),
    role: 'user',
  }
];

const assets: Asset[] = [
  {
    id: 'asset-1',
    name: 'Project Phoenix Specs',
    type: 'document',
    content: '/placeholder.pdf',
    uploaderId: 'user-2',
    createdAt: '2024-07-28T10:00:00Z',
    updatedAt: '2024-07-28T10:00:00Z',
  },
  {
    id: 'asset-2',
    name: 'Staging Server URL',
    type: 'link',
    content: 'https://staging.vaultspace.dev',
    uploaderId: 'user-3',
    createdAt: '2024-07-27T14:30:00Z',
    updatedAt: '2024-07-27T14:30:00Z',
  },
  {
    id: 'asset-3',
    name: 'OpenAI API Key (Legacy)',
    type: 'key',
    content: 'sk-d9f2j8wS7qA3xZvB6nK4tGbLpY1oHcR5eIuF0',
    uploaderId: 'user-1',
    createdAt: '2024-07-25T09:15:00Z',
    updatedAt: '2024-07-29T11:00:00Z',
  },
  {
    id: 'asset-4',
    name: 'New Logo Mockups',
    type: 'image',
    content: getImage('asset-logo-mockups'),
    uploaderId: 'user-2',
    createdAt: '2024-07-29T16:45:00Z',
    updatedAt: '2024-07-29T16:45:00Z',
  },
   {
    id: 'asset-5',
    name: 'Q3 Financial Report',
    type: 'document',
    content: '/placeholder.pdf',
    uploaderId: 'user-1',
    createdAt: '2024-07-20T11:00:00Z',
    updatedAt: '2024-07-21T10:00:00Z',
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'user-2',
    action: 'UPLOADED',
    assetId: 'asset-4',
    assetName: 'New Logo Mockups',
    timestamp: '2024-07-29T16:45:00Z',
  },
  {
    id: 'log-2',
    userId: 'user-1',
    action: 'EDITED',
    assetId: 'asset-3',
    assetName: 'OpenAI API Key (Legacy)',
    timestamp: '2024-07-29T11:00:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-3',
    action: 'VIEWED',
    assetId: 'asset-3',
    assetName: 'OpenAI API Key (Legacy)',
    timestamp: '2024-07-29T10:55:00Z',
  },
    {
    id: 'log-4',
    userId: 'user-2',
    action: 'COPIED',
    assetId: 'asset-3',
    assetName: 'OpenAI API Key (Legacy)',
    timestamp: '2024-07-29T09:20:00Z',
  },
  {
    id: 'log-5',
    userId: 'user-3',
    action: 'UPLOADED',
    assetId: 'asset-2',
    assetName: 'Staging Server URL',
    timestamp: '2024-07-27T14:30:00Z',
  },
];

// In a real app, this would involve authentication and a database call.
// For this prototype, we'll just return the admin user.
export const getCurrentUser = (): User => users.find(u => u.role === 'admin')!;

export const getUsers = (): User[] => users;

export const getAssetsWithUploader = () => {
  return assets.map(asset => {
    const uploader = users.find(user => user.id === asset.uploaderId);
    return { ...asset, uploader };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getActivityLogsWithUser = () => {
    return activityLogs.map(log => {
        const user = users.find(u => u.id === log.userId);
        return { ...log, user };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
