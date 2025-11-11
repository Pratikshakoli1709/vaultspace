
import { User, DataItem, ActivityLog, Notification, DataItemType, UserRole } from './types';
import { getMockUsers, getMockDataItems, getMockActivityLogs, getMockNotifications } from './mock-data';

export type EnrichedDataItem = DataItem & { uploader?: User };
export type EnrichedActivityLog = ActivityLog & { user?: User };
export type EnrichedNotification = Notification & { sender_details?: User };


export const getRealUsers = async (): Promise<User[]> => {
  // This function would fetch from a real database.
  // For now, it returns mock data.
  return getMockUsers();
};

export const getRealDataItems = async (): Promise<EnrichedDataItem[]> => {
  const items = getMockDataItems();
  const users = getMockUsers();
  const userMap = new Map(users.map(u => [u.id, u]));

  return items.map(item => ({
    ...item,
    uploader: userMap.get(item.created_by),
  }));
};


export const getRealActivityLogs = async (): Promise<EnrichedActivityLog[]> => {
    const logs = getMockActivityLogs();
    const users = getMockUsers();
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return logs.map(log => ({
      ...log,
      user: userMap.get(log.user_id),
    }))
};

export const getNotifications = (): EnrichedNotification[] => {
  const allUsers = getMockUsers();
  const notifications = getMockNotifications();
  return notifications.map(notif => {
    const sender = allUsers.find(u => u.id === notif.sender_id);
    return { ...notif, sender_details: sender };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
