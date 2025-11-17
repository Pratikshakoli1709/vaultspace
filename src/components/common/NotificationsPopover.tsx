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
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Recent updates and announcements.
            </p>
          </div>
          <div className="grid gap-2">
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
            )}
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
              >
                {!notification.is_read && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />}
                <div className={`grid gap-1 ${notification.is_read ? 'col-start-2' : ''}`}>
                  <p className="text-sm font-medium leading-none flex items-center gap-2">
                    {notification.type === 'broadcast' && <Megaphone className="h-4 w-4 text-muted-foreground" />}
                    {notification.sender_details?.name || 'System'}
                  </p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
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
