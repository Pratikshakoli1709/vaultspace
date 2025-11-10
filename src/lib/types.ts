export type UserRole = 'admin' | 'user';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
};

export type AssetType = 'document' | 'link' | 'key' | 'image';

export type Asset = {
  id: string;
  name:string;
  type: AssetType;
  content: string; // URL for image/doc, the link itself, or the key value
  uploaderId: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  assetId?: string;
  assetName?: string;
  timestamp: string;
};
