import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * Menu body with a search box: typing narrows the options, arrow keys move,
 * Enter picks. Shared by searchable filter dropdowns and form fields.
 */
export function SearchMenu({
  label,
  options,
  value,
  onSelect,
  searchPlaceholder,
  emptyMessage,
}: {
  label: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
  /** Replaces the default "No ... found." text, e.g. when the options failed to load. */
  emptyMessage?: string;
}) {
  return (
    <Command
      className="bg-popover"
      // Plain "contains" matching; the default fuzzy match also hits names that
      // merely share scattered letters (e.g. "anti" matching "Santa Remedios").
      filter={(itemValue, search) =>
        itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
      }
    >
      <CommandInput
        placeholder={searchPlaceholder ?? `Search ${label.toLowerCase()}...`}
        aria-label={`Search ${label.toLowerCase()}`}
        className="h-11"
      />
      <CommandList className="max-h-72 p-1">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {emptyMessage ?? `No ${label.toLowerCase()} found.`}
        </CommandEmpty>
        {options.map((option) => (
          <CommandItem
            key={option.value}
            value={option.label}
            onSelect={() => onSelect(option.value)}
            className={cn(
              "relative cursor-pointer rounded-md py-2 pr-9 pl-3 text-sm data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
              option.value === value && "font-semibold text-primary",
            )}
          >
            {option.label}
            {option.value === value && (
              <Check className="absolute right-2.5 h-4 w-4 text-gold" aria-hidden="true" />
            )}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}

/** Form field version: looks like the other inputs, opens a searchable menu. */
export function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
  className,
  emptyMessage,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value)?.label;

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled ?? false}>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-background/60 px-4 text-left text-sm text-foreground transition-[border-color,box-shadow] outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-ring data-[state=open]:ring-4 data-[state=open]:ring-ring/15",
              className,
            )}
          >
            <span className={cn("truncate", !current && "text-muted-foreground/80")}>
              {current ?? placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-lg border-border/60 p-0 shadow-[var(--shadow-card)]"
        >
          <SearchMenu
            label={label}
            options={options}
            value={value}
            emptyMessage={emptyMessage}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {/* Keeps native "required" validation working for this custom control. */}
      {required && !disabled && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => undefined}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
        />
      )}
    </div>
  );
}
