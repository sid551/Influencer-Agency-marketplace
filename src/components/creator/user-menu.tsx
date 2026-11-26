"use client";

import { useRef } from "react";
import { cn } from "cn";

import { signOut } from "@/app/(auth)/actions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface UserMenuProps {
  email: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  /** Show the account name/email beside the avatar in the sidebar. */
  showIdentity?: boolean;
}

function initialsOf(name: string | null, email: string): string {
  const source = (name ?? email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu({
  email,
  fullName,
  username,
  avatarUrl,
  showIdentity = false,
}: UserMenuProps) {
  const signOutFormRef = useRef<HTMLFormElement>(null);
  const displayName = fullName || username || email;

  return (
    <>
      {/* Progressive-enhancement form: the menu item submits it. */}
      <form ref={signOutFormRef} action={signOut} className="hidden" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Account menu for ${displayName}`}
            className={cn(
              "flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              showIdentity &&
                "w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/60",
            )}
          >
            <Avatar className="size-8 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-xs">
                {initialsOf(fullName, email)}
              </AvatarFallback>
            </Avatar>
            {showIdentity ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {displayName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">
              {displayName}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              // Keep the menu open while the form action runs.
              event.preventDefault();
              signOutFormRef.current?.requestSubmit();
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/** Placeholder while the session streams in. */
export function UserMenuSkeleton({ showIdentity = false }: { showIdentity?: boolean }) {
  if (showIdentity) {
    return (
      <div className="flex w-full items-center gap-2 px-2 py-2">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Skeleton className="hidden h-4 w-24 sm:block" />
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}
