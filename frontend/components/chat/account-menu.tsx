"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import type { User } from "@/lib/auth-client";

export function AccountMenu({ user }: { user: User }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    async function handleSignOut() {
        setPending(true);
        await signOut();
        router.replace("/login");
        router.refresh();
    }

    return (
        <div className="flex items-center gap-3 pb-3">
            <Avatar>
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                    <HugeiconsIcon icon={MoreVerticalIcon} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" disabled={pending} onClick={handleSignOut}>
                        {pending ? "Signing out..." : "Sign out"}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
