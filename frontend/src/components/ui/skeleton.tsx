import { cn } from "@/lib/utils";

/** Placeholder block with a soft shimmer, shown while content loads. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
