'use client';

import { create } from 'zustand';
import type { Folder, FolderWithChildren, FileWithVersions, User } from '@/lib/types';

interface FolderStore {
  // State
  folders: FolderWithChildren[];
  selectedFolderId: string | null; // null = root, 'starred' = starred view, 'recent' = recent view
  breadcrumbs: Folder[];
  recentFiles: FileWithVersions[];
  starredItems: (Folder | FileWithVersions)[];
  
  // Folder actions
  setFolders: (folders: FolderWithChildren[]) => void;
  createFolder: (folder: Folder) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (folderId: string) => void;
  moveFolder: (folderId: string, newParentId: string | null) => void;
  
  // File actions
  moveFile: (fileId: string, folderId: string | null) => void;
  starItem: (itemId: string, type: 'file' | 'folder') => void;
  unstarItem: (itemId: string, type: 'file' | 'folder') => void;
  
  // Navigation
  setSelectedFolder: (folderId: string | null) => void;
  updateBreadcrumbs: (folderId: string | null) => void;
  
  // Recent & Starred
  addToRecent: (file: FileWithVersions) => void;
  updateRecentFiles: (files: FileWithVersions[]) => void;
  updateStarredItems: (items: (Folder | FileWithVersions)[]) => void;
  
  // Utilities
  getFolderById: (folderId: string | null) => FolderWithChildren | null;
  getFolderPath: (folderId: string | null) => Folder[];
  canUserAccessFolder: (folder: Folder, user: User) => boolean;
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  // Initial state
  folders: [],
  selectedFolderId: null,
  breadcrumbs: [],
  recentFiles: [],
  starredItems: [],
  
  // Folder actions
  setFolders: (folders) => set({ folders }),
  
  createFolder: (folder) => set((state) => {
    const newFolders = [...state.folders];
    if (folder.parentId) {
      // Add to parent's children
      const parent = get().getFolderById(folder.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(folder as FolderWithChildren);
      }
    } else {
      // Root level folder
      newFolders.push(folder as FolderWithChildren);
    }
    return { folders: newFolders };
  }),
  
  updateFolder: (folderId, updates) => set((state) => {
    const updateRecursive = (folders: FolderWithChildren[]): FolderWithChildren[] => {
      return folders.map((f) => {
        if (f.id === folderId) {
          return { ...f, ...updates };
        }
        if (f.children) {
          return { ...f, children: updateRecursive(f.children) };
        }
        return f;
      });
    };
    
    return { folders: updateRecursive(state.folders) };
  }),
  
  deleteFolder: (folderId) => set((state) => {
    const deleteRecursive = (folders: FolderWithChildren[]): FolderWithChildren[] => {
      return folders.filter((f) => {
        if (f.id === folderId) return false;
        if (f.children) {
          f.children = deleteRecursive(f.children);
        }
        return true;
      });
    };
    
    return { folders: deleteRecursive(state.folders) };
  }),
  
  moveFolder: (folderId, newParentId) => set((state) => {
    // Find and remove folder from old location
    let movedFolder: FolderWithChildren | null = null;
    
    const removeRecursive = (folders: FolderWithChildren[]): FolderWithChildren[] => {
      return folders.filter((f) => {
        if (f.id === folderId) {
          movedFolder = { ...f };
          return false;
        }
        if (f.children) {
          f.children = removeRecursive(f.children);
        }
        return true;
      });
    };
    
    const newFolders = removeRecursive([...state.folders]);
    
    if (!movedFolder) return { folders: state.folders };
    
    // Update parent reference
    movedFolder.parentId = newParentId;
    
    // Add to new location
    if (newParentId) {
      const parent = get().getFolderById(newParentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(movedFolder);
      }
    } else {
      newFolders.push(movedFolder);
    }
    
    return { folders: newFolders };
  }),
  
  moveFile: (fileId, folderId) => {
    // This will be handled by parent components that manage files
    // Store just tracks the mapping
    console.log(`Moving file ${fileId} to folder ${folderId}`);
  },
  
  starItem: (itemId, type) => set((state) => {
    // Optimistic update - actual API call should be made by component
    if (type === 'folder') {
      const folder = get().getFolderById(itemId);
      if (folder) {
        get().updateFolder(itemId, { isStarred: true });
        // Add to starred items if not already there
        if (!state.starredItems.find((item) => item.id === itemId)) {
          state.starredItems.push(folder);
        }
      }
    } else if (type === 'file') {
      // For files, we need to get the file from the parent component
      // The component should pass the full file object when calling starItem
      // For now, we'll just track the ID and let the component handle the full object
      // This will be updated when the file is synced from the database
    }
    return { starredItems: [...state.starredItems] };
  }),
  
  unstarItem: (itemId, type) => set((state) => {
    if (type === 'folder') {
      get().updateFolder(itemId, { isStarred: false });
    }
    // Remove from starred items (works for both files and folders)
    return {
      starredItems: state.starredItems.filter((item) => item.id !== itemId)
    };
  }),
  
  setSelectedFolder: (folderId) => {
    set({ selectedFolderId: folderId });
    get().updateBreadcrumbs(folderId);
  },
  
  updateBreadcrumbs: (folderId) => {
    if (!folderId || folderId === 'root') {
      set({ breadcrumbs: [] });
      return;
    }
    
    const path = get().getFolderPath(folderId);
    set({ breadcrumbs: path });
  },
  
  addToRecent: (file) => {
    set((state) => {
      const filtered = state.recentFiles.filter((f) => f.id !== file.id);
      return {
        recentFiles: [{ ...file, lastAccessed: new Date().toISOString() }, ...filtered].slice(0, 50)
      };
    });
  },
  
  updateRecentFiles: (files) => set({ recentFiles: files }),
  
  updateStarredItems: (items) => set({ starredItems: items }),
  
  // Utilities
  getFolderById: (folderId) => {
    if (!folderId) return null;
    
    const findRecursive = (folders: FolderWithChildren[]): FolderWithChildren | null => {
      for (const folder of folders) {
        if (folder.id === folderId) return folder;
        if (folder.children) {
          const found = findRecursive(folder.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findRecursive(get().folders);
  },
  
  getFolderPath: (folderId) => {
    if (!folderId) return [];
    
    const path: Folder[] = [];
    const findPath = (folders: FolderWithChildren[], targetId: string): boolean => {
      for (const folder of folders) {
        if (folder.id === targetId) {
          path.unshift(folder);
          return true;
        }
        if (folder.children) {
          if (findPath(folder.children, targetId)) {
            path.unshift(folder);
            return true;
          }
        }
      }
      return false;
    };
    
    findPath(get().folders, folderId);
    return path;
  },
  
  canUserAccessFolder: (folder, user) => {
    // Admin has access to everything
    if (user.role === 'admin') return true;
    // User has access to their own folders
    if (folder.ownerId === user.id) return true;
    // User has access to shared folders
    if (folder.sharedWith?.includes(user.id)) return true;
    return false;
  },
}));

