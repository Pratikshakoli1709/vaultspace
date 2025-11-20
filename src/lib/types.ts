
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
  file_url?: string | null;
  link_url?: string | null;
  text_content?: string | null;
  storage_path?: string | null;
  created_by: string; // user id
  updated_by?: string | null; // user id
  created_at: string;
  updated_at: string;
};

export type ActivityLogAction = 'UPLOADED' | 'EDITED' | 'VIEWED' | 'COPIED' | 'DELETED' | 'BROADCAST';

export type ActivityLog = {
  id: string;
  user_id: string;
  item_id?: string;
  action: ActivityLogAction;
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

export type EnrichedDataItem = DataItem & {
  uploader?: User;
  sharedWith?: string[];
  visibility?: 'public' | 'team' | 'private';
  teamId?: string | null;
  allowedUsers?: string[];
  folderId?: string | null;
  is_starred?: boolean;
  isStarred?: boolean;
  // AI features
  extracted_text?: string | null;
  raw_text?: string | null;
  embedding?: number[] | string | null;
  category?: string | null;
  tags?: string[] | null;
  ai_summary?: string | null;
};

// Folder system types
export type Folder = {
  id: string;
  name: string;
  parentId: string | null; // null for root level
  ownerId: string; // user id
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
  sharedWith?: string[]; // user ids who have access
  visibility?: 'public' | 'team' | 'private';
  teamId?: string | null;
  allowedUsers?: string[];
};

export type FolderWithChildren = Folder & {
  children?: Folder[];
  files?: EnrichedDataItem[];
};

// Version system types
export type FileVersion = {
  id: string;
  fileId: string; // DataItem id
  versionNumber: number;
  uploadedBy: string; // user id
  timestamp: string;
  fileUrl?: string | null;
  storagePath?: string | null;
  diff?: string | null; // for text files
  size?: number;
  changelog?: string | null; // optional changelog message
  uploadedByName?: string; // user name for display
};

export type FileWithVersions = EnrichedDataItem & {
  versions?: FileVersion[];
  currentVersion?: number;
  folderId?: string | null;
  isStarred?: boolean;
  lastAccessed?: string | null;
  sharedLink?: string | null;
  shareAccess?: 'view' | 'edit';
  isInTrash?: boolean;
  deletedAt?: string | null;
  visibility?: 'public' | 'team' | 'private';
  teamId?: string | null;
  allowedUsers?: string[];
};

// Team system types
export type Team = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  isAdmin: boolean;
  addedBy: string;
  addedAt: string;
  user?: User; // Enriched with user data
};

export type TeamWithMembers = Team & {
  members: TeamMember[];
  memberCount: number;
  adminCount: number;
};

// Trash system types
export type TrashItem = {
  id: string;
  type: 'file' | 'folder';
  name: string;
  deletedAt: string;
  deletedBy: string;
  originalPath?: string;
  data?: FileWithVersions | Folder;
};

export type EnrichedActivityLog = ActivityLog & { user?: User };
export type EnrichedNotification = Notification & { sender_details?: User };
