import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedActivityLog } from "@/lib/types";
import { format } from "date-fns";

interface ActivityLogListProps {
  activityLogs: EnrichedActivityLog[];
}

const actionColors: Record<string, string> = {
    UPLOADED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    EDITED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    VIEWED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    COPIED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    DELETED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}


export function ActivityLogList({ activityLogs }: ActivityLogListProps) {
  return (
    <div className="dashboard-center w-full">
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Activity Log</CardTitle>
        <CardDescription className="text-sm">An audit trail of all actions taken within VaultSpace.</CardDescription>
      </CardHeader>
      <CardContent className="w-full overflow-x-auto p-0 sm:p-6">
        <div className="w-full min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="text-xs sm:text-sm">User</TableHead>
                <TableHead className="text-xs sm:text-sm">Action</TableHead>
                <TableHead className="hidden md:table-cell text-xs sm:text-sm">Asset</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((log) => (
              <TableRow key={log.id}>
                  <TableCell className="min-w-0 sm:min-w-[120px]">
                  <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarImage src={log.user?.avatarUrl} />
                        <AvatarFallback className="text-xs">{log.user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-sm sm:text-base truncate">{log.user?.name}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">{log.user?.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary" className={`text-xs ${actionColors[log.action] || ''}`}>
                    {log.action}
                  </Badge>
                </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm truncate block max-w-full sm:max-w-[200px]">{log.item_title || "N/A"}</span>
                  </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                      <span className="text-xs sm:text-sm font-medium">
                      {format(new Date(log.timestamp), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), 'h:mm a')}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
