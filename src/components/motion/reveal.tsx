"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

/**
 * Reveals its children the first time they scroll into view (fade + rise).
 * Visitors with reduced motion see the content immediately, and the observer
 * disconnects after the first reveal.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  /** Stagger in milliseconds before the reveal starts. */
  delay?: number;
  className?: string;
  /** Render as a different element (e.g. "li") to keep valid markup. */
  as?: "div" | "li" | "section";
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Reduced-motion visitors already see the content: the global CSS
    // override forces .fx-reveal visible, so the class below changes nothing.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Runtime element comes from `as`; the cast only keeps TS happy about the ref.
  const Component = as as "div";

  return (
    <Component
      ref={nodeRef}
      style={
        delay
          ? ({ "--fx-reveal-delay": `${delay}ms` } as React.CSSProperties)
          : undefined
      }
      className={cn("fx-reveal", visible && "fx-is-visible", className)}
    >
      {children}
    </Component>
  );
}
