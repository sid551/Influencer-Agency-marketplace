"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, PlusIcon, SearchIcon } from "lucide-react";

import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Long lists (a few states have 1000+ cities) render in pages. */
const MAX_VISIBLE = 60;

type ComboboxProps = Omit<
  React.ComponentProps<"button">,
  "value" | "onChange" | "children" | "onClick" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when no option matches the search text. */
  emptyMessage?: string;
  /**
   * Lets the user keep a value that isn't in the list (small towns, or a
   * state saved before this list existed) instead of being blocked.
   */
  allowCustomValue?: boolean;
  className?: string;
};

/**
 * Searchable dropdown (combobox): type to filter, arrow keys to move,
 * Enter to pick. Used for the location fields so users pick from real
 * data instead of free-typing — while still allowing an unmatched value.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  allowCustomValue = false,
  className,
  disabled,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Prefix matches first, then substring matches, then alphabetical.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [...options];
    const scored: Array<{ option: string; rank: number; index: number }> = [];
    options.forEach((option, index) => {
      const haystack = option.toLowerCase();
      let rank = -1;
      if (haystack === needle) rank = 0;
      else if (haystack.startsWith(needle)) rank = 1;
      else if (haystack.includes(needle)) rank = 2;
      if (rank >= 0) scored.push({ option, rank, index });
    });
    scored.sort((a, b) => a.rank - b.rank || a.index - b.index);
    return scored.map((entry) => entry.option);
  }, [options, query]);

  const visible = matches.slice(0, MAX_VISIBLE);
  const customQuery = query.trim();
  const canUseCustom =
    allowCustomValue &&
    customQuery.length > 0 &&
    !matches.some((option) => option.toLowerCase() === customQuery.toLowerCase());

  function select(option: string) {
    onChange(option);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(visible.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Never let Enter submit the surrounding form from the search box.
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) select(option);
      else if (canUseCustom) select(customQuery);
    }
  }

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    node?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, matches.length]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setActiveIndex(0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          {...props}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card/80 px-3.5 text-left text-base outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:disabled:bg-input/80",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            className,
          )}
        >
          <span
            className={cn(
              "truncate",
              !value && "text-muted-foreground",
            )}
          >
            {value || placeholder}
          </span>
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-0 p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoComplete="off"
            className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-64 overflow-y-auto p-1"
        >
          {visible.map((option, index) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              data-active={index === activeIndex || undefined}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => select(option)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
                index === activeIndex ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <CheckIcon
                className={cn(
                  "size-4 shrink-0",
                  option === value
                    ? "text-primary opacity-100"
                    : "opacity-0",
                )}
              />
              <span className="truncate">{option}</span>
            </button>
          ))}

          {canUseCustom ? (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseMove={() => setActiveIndex(visible.length)}
              onClick={() => select(customQuery)}
              className={cn(
                "mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-left text-sm",
                activeIndex >= visible.length
                  ? "bg-muted"
                  : "hover:bg-muted/60",
              )}
            >
              <PlusIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate">
                Use “{customQuery}”
              </span>
            </button>
          ) : null}

          {visible.length === 0 && !canUseCustom ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
        </div>

        {matches.length > visible.length ? (
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Showing {visible.length} of {matches.length} — keep typing to narrow
            down.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
