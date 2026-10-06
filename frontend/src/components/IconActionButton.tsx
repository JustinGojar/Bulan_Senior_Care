import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
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
          variant === "primary" && "bg-navy text-white shadow-[var(--shadow-card)]",
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

// Radix Select items cannot use "" as a value, so empty values travel under this key.
const EMPTY_VALUE = "__empty__";
const toItemValue = (value: string) => (value === "" ? EMPTY_VALUE : value);
const fromItemValue = (value: string) => (value === EMPTY_VALUE ? "" : value);

/**
 * Filter dropdown that is icon-only with a tooltip on mobile, and shows the
 * selected option as text from the `sm` breakpoint up. Opens a styled menu
 * (keyboard and type-ahead friendly). A non-default choice is marked with a
 * gold dot, and on mobile the button fills navy since the value is hidden.
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
    <SelectPrimitive.Root
      value={toItemValue(value)}
      onValueChange={(next) => onChange(fromItemValue(next))}
      disabled={disabled ?? false}
    >
      <TapTooltip label={`${label}: ${current}`} disabled={labelsVisible}>
        <SelectPrimitive.Trigger
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            "group relative flex h-10 min-w-0 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-card px-2.5 text-foreground shadow-[0_2px_8px_rgba(23,58,82,0.04)] transition-[border-color,box-shadow,background-color] outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 data-[state=open]:border-ring data-[state=open]:ring-4 data-[state=open]:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:gap-2 sm:px-3",
            active &&
              "sm:border-gold/60 sm:bg-gold/5 max-sm:border-transparent max-sm:bg-navy max-sm:text-white",
            className,
          )}
        >
          <span
            className={cn(
              "shrink-0 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4",
              active && "max-sm:text-white sm:text-gold-foreground dark:sm:text-gold",
            )}
          >
            {icon}
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-left text-xs font-semibold sm:block">
            {prefix && (
              <span className="mr-1.5 text-[10px] font-normal text-muted-foreground">{prefix}</span>
            )}
            {current}
          </span>
          {active && (
            <span
              aria-hidden="true"
              className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-gold sm:block"
            />
          )}
          <ChevronDown
            aria-hidden="true"
            className="h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:h-4 sm:w-4"
          />
        </SelectPrimitive.Trigger>
      </TapTooltip>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="start"
          sideOffset={6}
          className="z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[max(var(--radix-select-trigger-width),12rem)] overflow-hidden rounded-lg border border-border/60 bg-popover text-popover-foreground shadow-[var(--shadow-card)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <p className="border-b border-border/60 px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </p>
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-72 p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={toItemValue(option.value)}
                className="relative flex w-full cursor-pointer items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none select-none data-[highlighted]:bg-muted data-[state=checked]:font-semibold data-[state=checked]:text-primary"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
                  <Check className="h-4 w-4 text-gold" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
