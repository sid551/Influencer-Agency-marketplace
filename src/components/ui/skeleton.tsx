import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("fx-skeleton rounded-xl bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
