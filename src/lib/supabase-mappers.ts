import type {
  DataItemType,
  EnrichedActivityLog,
  EnrichedDataItem,
  User,
  UserRole,
} from './types';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
};

export type DataItemRow = {
  id: string;
  title: string;
  type: DataItemType | string;
  file_url: string | null;
  link_url: string | null;
  text_content: string | null;
  storage_path: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  visibility?: 'public' | 'team' | 'private' | null;
  team_id?: string | null;
  allowed_users?: string[] | null;
  folder_id?: string | null;
  is_starred?: boolean | null;
  extracted_text?: string | null;
  raw_text?: string | null;
  embedding?: string | number[] | null; // Can be string (JSON) or array
  category?: string | null;
  tags?: string[] | null;
  ai_summary?: string | null;
  profiles?: ProfileRow | null;
  asset_shares?: { user_id: string }[] | null;
};

export type ActivityLogRow = {
  id: string;
  user_id: string;
  item_id: string | null;
  action: string;
  item_title: string | null;
  timestamp: string;
  profiles?: ProfileRow | null;
};

const resolveRole = (role: string | null): UserRole => (role === 'admin' ? 'admin' : 'user');

const buildAvatar = (seed: string | null, fallbackId: string): string =>
  `https://i.pravatar.cc/150?u=${encodeURIComponent(seed ?? fallbackId)}`;

export const mapProfileRowToUser = (profile: ProfileRow): User => {
  const name = profile.full_name ?? profile.email ?? 'User';
  const email = profile.email ?? '';
  const avatarSeed = profile.avatar_url ?? email ?? profile.id;

  return {
    id: profile.id,
    name,
    email,
    role: resolveRole(profile.role),
    avatarUrl: buildAvatar(avatarSeed, profile.id),
    createdAt: profile.created_at ?? new Date().toISOString(),
  };
};

export const mapRowToAsset = (row: DataItemRow): EnrichedDataItem => {
  const uploader = row.profiles ? mapProfileRowToUser(row.profiles) : undefined;
  const shareRecipientIds =
    row.asset_shares?.map((entry) => entry.user_id).filter((value): value is string => Boolean(value)) ?? [];

  // Parse embedding if it's a string
  let embedding: number[] | null = null;
  if (row.embedding) {
    if (typeof row.embedding === 'string') {
      try {
        embedding = JSON.parse(row.embedding);
      } catch {
        // If parsing fails, try to parse as PostgreSQL array format
        try {
          embedding = row.embedding.replace(/[{}]/g, '').split(',').map(Number);
        } catch {
          embedding = null;
        }
      }
    } else if (Array.isArray(row.embedding)) {
      embedding = row.embedding;
    }
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type as DataItemType,
    file_url: row.file_url ?? undefined,
    link_url: row.link_url ?? undefined,
    text_content: row.text_content ?? undefined,
    storage_path: row.storage_path ?? undefined,
    created_by: row.created_by,
    updated_by: row.updated_by ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    visibility: (row.visibility as 'public' | 'team' | 'private') || 'public',
    teamId: row.team_id ?? undefined,
    allowedUsers: row.allowed_users ?? undefined,
    folderId: row.folder_id ?? undefined,
    is_starred: row.is_starred ?? false,
    isStarred: row.is_starred ?? false,
    extracted_text: row.extracted_text ?? undefined,
    raw_text: row.raw_text ?? undefined,
    embedding: embedding ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? undefined,
    ai_summary: row.ai_summary ?? undefined,
    uploader,
    sharedWith: shareRecipientIds,
  };
};

export const mapRowToActivityLog = (row: ActivityLogRow): EnrichedActivityLog => {
  const user = row.profiles ? mapProfileRowToUser(row.profiles) : undefined;

  return {
    id: row.id,
    user_id: row.user_id,
    item_id: row.item_id ?? undefined,
    action: row.action as EnrichedActivityLog['action'],
    item_title: row.item_title ?? undefined,
    timestamp: row.timestamp,
    user,
  };
};
