"use client";

import { useRef } from "react";

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
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar className="size-8">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-xs">
                {initialsOf(fullName, email)}
              </AvatarFallback>
            </Avatar>
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

/** Header placeholder while the session streams in. */
export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="hidden h-4 w-24 sm:block" />
      <Skeleton className="size-8 rounded-full" />
    </div>
  );
}
