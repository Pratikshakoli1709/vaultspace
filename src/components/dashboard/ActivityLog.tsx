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
import { EnrichedActivityLog } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";

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
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>An audit trail of all actions taken within VaultSpace.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden md:table-cell">Asset</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={log.user?.avatarUrl} />
                      <AvatarFallback>{log.user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">{log.user?.name}</span>
                        <span className="text-sm text-muted-foreground">{log.user?.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={actionColors[log.action] || ''}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{log.item_title || "N/A"}</TableCell>
                <TableCell className="text-right">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
