export type UserRole = 'admin' | 'user';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  createdAt: string;
};

export type DataItemType = 'document' | 'link' | 'key' | 'image';

export type DataItem = {
  id: string;
  title: string;
  type: DataItemType;
  file_url?: string;
  link_url?: string;
  text_content?: string;
  created_by: string; // user id
  updated_by?: string; // user id
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  item_id?: string;
  action: string;
  item_title?: string;
  timestamp: string;
};

export type Notification = {
  id: string;
  sender_id: string; // user id or 'system'
  receiver_id?: string; // user id, null for broadcast
  message: string;
  type: 'broadcast' | 'personal';
  is_read: boolean;
  timestamp: string;
}
