"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Bell, Megaphone } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { EnrichedNotification } from "@/lib/types"

export function NotificationsPopover({ notifications }: { notifications: EnrichedNotification[] }) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bell className="h-5 w-5"/>
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            )}
            <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm" align="end">
        <div className="grid gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="font-medium leading-none text-sm sm:text-base">Notifications</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Recent updates and announcements.
            </p>
          </div>
          <div className="grid gap-2 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No new notifications.</p>
            )}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="grid grid-cols-[20px_1fr] sm:grid-cols-[25px_1fr] items-start pb-3 sm:pb-4 last:mb-0 last:pb-0 gap-1.5 sm:gap-2"
              >
                {!notification.is_read && <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 translate-y-1 rounded-full bg-primary" />}
                <div className={`grid gap-1 min-w-0 ${notification.is_read ? 'col-start-2' : ''}`}>
                  <p className="text-xs sm:text-sm font-medium leading-none flex items-center gap-1.5 sm:gap-2 truncate">
                    {notification.type === 'broadcast' && <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />}
                    <span className="truncate">{notification.sender_details?.name || 'System'}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{notification.message}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
