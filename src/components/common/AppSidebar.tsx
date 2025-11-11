
"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Home, Settings, Shield, LogOut } from "lucide-react"
import { User } from "@/lib/types"
import { Logo } from "./Logo"
import { useRouter } from "next/navigation"

export function AppSidebar({ user }: { user: User }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        router.push('/');
    }
    
    const dashboardPath = user.role === 'admin' ? '/adminDashboard' : '/userDashboard';
    const settingsPath = `/settings?name=${encodeURIComponent(user.name)}`;


    return (
        <Sidebar>
            <SidebarHeader className="h-16 flex items-center gap-2 px-4">
                <Logo />
                <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-sidebar-foreground tracking-tighter">
                        VaultSpace
                    </h2>
                </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href={dashboardPath}>
                          <SidebarMenuButton tooltip="Dashboard" isActive={pathname.includes('Dashboard')}>
                                <Home />
                                <span>Dashboard</span>
                          </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    {user.role === 'admin' && (
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Admin Panel">
                                <Shield />
                                <span>Admin Panel</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                       <Link href={settingsPath}>
                            <SidebarMenuButton tooltip="Settings" isActive={pathname === '/settings'}>
                                <Settings />
                                <span>Settings</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2">
                 <Separator className="my-2 bg-sidebar-border" />
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout}>
                             <LogOut />
                            <span>Log out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
