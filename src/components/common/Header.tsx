'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { EnrichedDataItem, EnrichedNotification, User } from '@/lib/types';
import { LogOut, PlusCircle, Search, Settings, User as UserIcon, X } from 'lucide-react';
import { UploadAssetDialog } from '../dashboard/UploadAssetDialog';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsPopover } from './NotificationsPopover';
import { BroadcastDialog } from '../dashboard/BroadcastDialog';
import { EditProfileDialog } from '../dashboard/EditProfileDialog';
import supabase from '@/lib/supabaseClient';

interface HeaderProps {
  user: User;
  notifications: EnrichedNotification[];
  onAssetCreated: (asset: EnrichedDataItem) => void;
  onUserUpdate: (user: User) => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  shareableUsers?: User[];
  broadcastTargets?: { id: string; name: string }[];
}

export function Header({
  user,
  notifications,
  onAssetCreated,
  onUserUpdate,
  searchTerm,
  onSearchChange,
  shareableUsers,
  broadcastTargets = [],
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-card w-full max-w-none m-0 p-0">
      <div className="app-header-bar flex h-16 w-full items-center px-4 md:px-6">
        {/* Dashboard Title Group - Left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl font-semibold whitespace-nowrap">Dashboard</h1>
        </div>

        {/* Search Bar - Middle with auto margin */}
        <div className="relative flex-1 max-w-md mx-4 md:mx-8">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assets..."
            value={searchTerm ?? ''}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="w-full rounded-lg bg-background pl-8 pr-8"
          />
          {onSearchChange && (searchTerm ?? '').length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 text-muted-foreground transition hover:text-foreground"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action Group - Right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <ThemeToggle />
          <NotificationsPopover notifications={notifications} />

          {user.role === 'admin' && (
            <BroadcastDialog currentUser={user} targets={broadcastTargets} />
          )}

          <UploadAssetDialog user={user} availableUsers={shareableUsers ?? []} onAssetCreated={onAssetCreated}>
            <div>
              <Button size="sm" className="hidden sm:flex">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
              <Button size="icon" className="sm:hidden">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
          </UploadAssetDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <EditProfileDialog user={user} onUserUpdate={onUserUpdate}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </EditProfileDialog>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}