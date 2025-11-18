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
    <header className="sticky top-0 z-10 border-b bg-card w-full m-0 p-0 overflow-x-hidden">
      <div className="app-header-bar flex h-14 sm:h-16 w-full items-center gap-1 sm:gap-2 md:gap-3 px-6 xl:px-10 2xl:px-16">
        {/* Dashboard Title Group - Left */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0">
          <SidebarTrigger className="md:hidden h-7 w-7 sm:h-8 sm:w-8" />
          <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold whitespace-nowrap truncate max-w-[100px] sm:max-w-none">Dashboard</h1>
        </div>

        {/* Search Bar - Middle with auto margin */}
        <div className="relative flex-1 min-w-0 max-w-full sm:max-w-md mx-0.5 sm:mx-1 md:mx-2 lg:mx-4 xl:mx-8">
          <Search className="absolute left-2 sm:left-2.5 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchTerm ?? ''}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="w-full rounded-lg bg-background pl-7 sm:pl-8 pr-7 sm:pr-8 text-xs sm:text-sm md:text-base h-8 sm:h-9 md:h-10"
          />
          {onSearchChange && (searchTerm ?? '').length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 sm:right-2.5 top-2.5 text-muted-foreground transition hover:text-foreground"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>

        {/* Action Group - Right */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 flex-shrink-0">
          <ThemeToggle />
          <NotificationsPopover notifications={notifications} />

          {user.role === 'admin' && (
            <div className="hidden sm:block">
              <BroadcastDialog currentUser={user} targets={broadcastTargets} />
            </div>
          )}

          <UploadAssetDialog user={user} availableUsers={shareableUsers ?? []} onAssetCreated={onAssetCreated}>
            <div>
              <Button size="sm" className="hidden sm:flex text-xs sm:text-sm h-8 sm:h-9">
                <PlusCircle className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">Add Asset</span>
              </Button>
              <Button size="icon" className="sm:hidden h-7 w-7 sm:h-8 sm:w-8">
                <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </UploadAssetDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-xs sm:text-sm font-medium leading-none truncate">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
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