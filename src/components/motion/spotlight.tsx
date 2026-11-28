"use client";

import { useRef } from "react";
import { cn } from "cn";

/**
 * Tracks the pointer and writes its position to `--spot-x` / `--spot-y`,
 * which the global `.fx-spotlight` rule turns into a soft grayscale halo
 * that follows the cursor. Purely decorative — never captures events.
 */
export function Spotlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = nodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty(
      "--spot-x",
      `${((event.clientX - rect.left) / rect.width) * 100}%`,
    );
    node.style.setProperty(
      "--spot-y",
      `${((event.clientY - rect.top) / rect.height) * 100}%`,
    );
  }

  return (
    <div
      ref={nodeRef}
      onPointerMove={handlePointerMove}
      className={cn("fx-spotlight", className)}
    >
      {children}
    </div>
  );
}
