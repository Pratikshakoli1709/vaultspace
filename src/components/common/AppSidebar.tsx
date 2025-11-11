
"use client"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Home, Settings, Shield, LogOut } from "lucide-react"
import { User } from "@/lib/types"
import { Logo } from "./Logo"
import { useRouter } from "next/navigation"

export function AppSidebar({ user }: { user: User }) {
    const router = useRouter();

    const handleLogout = async () => {
        // Since we are not using a real auth provider, just redirect to home.
        router.push('/');
    }

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
                        <SidebarMenuButton tooltip="Dashboard" isActive>
                            <Home />
                            <span>Dashboard</span>
                        </SidebarMenuButton>
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
                        <SidebarMenuButton tooltip="Settings">
                            <Settings />
                            <span>Settings</span>
                        </SidebarMenuButton>
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
