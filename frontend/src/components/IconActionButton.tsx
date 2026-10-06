import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const TOUCH_TOOLTIP_MS = 1500;
/** Matches Tailwind's `sm` breakpoint, where labels become visible. */
const LABELS_VISIBLE_QUERY = "(min-width: 640px)";

function useLabelsVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(LABELS_VISIBLE_QUERY);
    const update = () => setVisible(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return visible;
}

/**
 * Tooltip that shows on hover and keyboard focus, and briefly on tap for touch
 * devices (which have no hover). `children` must be a single element.
 * When `disabled`, the children render without a tooltip.
 */
function TapTooltip({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const touchTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (touchTimer.current) window.clearTimeout(touchTimer.current);
    },
    [],
  );

  if (disabled) return children;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip
        open={open}
        onOpenChange={(next) => {
          // While a tap-triggered tooltip is showing, let the timer close it.
          if (!touchTimer.current) setOpen(next);
        }}
      >
        <TooltipTrigger
          asChild
          onPointerDown={(event) => {
            if (event.pointerType !== "touch") return;
            if (touchTimer.current) window.clearTimeout(touchTimer.current);
            setOpen(true);
            touchTimer.current = window.setTimeout(() => {
              touchTimer.current = null;
              setOpen(false);
            }, TOUCH_TOOLTIP_MS);
          }}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="z-[60] rounded-lg bg-[#173A52] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(23,58,82,0.3)] dark:bg-white dark:text-[#173A52]"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Action button that is icon-only with a tooltip on mobile, and shows its
 * text label from the `sm` breakpoint up. Pass `iconOnly` to keep it
 * icon-only on every screen size.
 */
export function IconActionButton({
  label,
  icon,
  badge,
  iconOnly = false,
  variant = "default",
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  label: string;
  icon: ReactNode;
  /** Small count on the top-right corner (mobile only); hidden when 0 or undefined. */
  badge?: number;
  iconOnly?: boolean;
  variant?: "default" | "primary" | "outline";
}) {
  const labelsVisible = useLabelsVisible();

  return (
    <TapTooltip label={label} disabled={labelsVisible && !iconOnly}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          "relative inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173A52]/30 disabled:pointer-events-none disabled:opacity-60 sm:h-12",
          iconOnly ? "sm:w-12" : "sm:w-auto sm:px-5",
          variant === "primary" && "bg-navy text-primary-foreground shadow-[var(--shadow-card)]",
          variant === "default" &&
            "bg-card text-foreground shadow-[var(--shadow-soft)] hover:bg-[#173A52]/5",
          variant === "outline" &&
            "border border-[#173A52]/20 bg-white text-[#173A52] shadow-[0_4px_12px_rgba(23,58,82,0.05)] hover:border-[#173A52]/40 hover:bg-[#173A52]/5 dark:bg-card dark:text-foreground",
          className,
        )}
        {...props}
      >
        {icon}
        {!iconOnly && (
          <span aria-hidden="true" className="hidden sm:inline">
            {label}
          </span>
        )}
        {!!badge && (
          <span
            className={cn(
              "absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white",
              !iconOnly && "sm:hidden",
            )}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    </TapTooltip>
  );
}

/**
 * Dropdown that is icon-only with a tooltip on mobile, and shows the selected
 * option as text from the `sm` breakpoint up. A transparent native <select>
 * covers the control so tapping opens the platform picker; a chevron marks it
 * as a dropdown. On mobile it fills navy when a non-default value is chosen,
 * since the selected value is not visible there.
 */
export function IconSelect({
  label,
  icon,
  value,
  defaultValue = "All",
  options,
  onChange,
  prefix,
  disabled,
  className,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  /** Muted text before the selected value on larger screens, e.g. "Sort by". */
  prefix?: string;
  disabled?: boolean;
  className?: string;
}) {
  const labelsVisible = useLabelsVisible();
  const active = value !== defaultValue;
  const current = options.find((option) => option.value === value)?.label ?? value;

  return (
    <TapTooltip label={`${label}: ${current}`} disabled={labelsVisible}>
      <div
        className={cn(
          "relative flex h-10 min-w-0 shrink-0 items-center gap-0.5 rounded-[10px] border border-[#173A52]/20 bg-white px-2 text-[#173A52] shadow-[0_4px_12px_rgba(23,58,82,0.05)] transition focus-within:border-[#173A52]/60 focus-within:ring-2 focus-within:ring-[#173A52]/10 hover:border-[#173A52]/40 dark:bg-card dark:text-foreground sm:h-11 sm:gap-2 sm:px-3",
          active &&
            "max-sm:border-[#173A52] max-sm:bg-[#173A52] max-sm:text-white max-sm:shadow-[0_6px_14px_rgba(23,58,82,0.25)]",
          disabled && "opacity-70",
          className,
        )}
      >
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="hidden min-w-0 flex-1 truncate text-xs font-semibold sm:block">
          {prefix && (
            <span className="mr-1.5 text-[10px] font-normal text-muted-foreground">{prefix}</span>
          )}
          {current}
        </span>
        <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0 opacity-70 sm:h-4 sm:w-4" />
        <select
          aria-label={`Filter by ${label.toLowerCase()}`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </TapTooltip>
  );
}
