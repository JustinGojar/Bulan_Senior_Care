import { FileSpreadsheet, FileText, FileType } from "lucide-react";
import { cloneElement, type MouseEvent, type ReactElement } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_FORMATS, canChooseFormatOnSave, type ExportFormat } from "@/lib/export-file";

const ICONS = { pdf: FileText, word: FileType, excel: FileSpreadsheet };

/**
 * Wraps an Export button. Where the browser's Save dialog has a "Save as type" list, the
 * button opens it directly (`onExport()` with no format); elsewhere it opens a menu of the
 * formats first and passes the chosen one.
 */
export function ExportMenu({
  formats,
  onExport,
  children,
}: {
  formats: ExportFormat[];
  onExport: (format?: ExportFormat) => void;
  children: ReactElement<{ onClick?: (event: MouseEvent<HTMLButtonElement>) => void }>;
}) {
  if (formats.length <= 1 || canChooseFormatOnSave()) {
    return cloneElement(children, { onClick: () => onExport() });
  }
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {formats.map((format) => {
          const Icon = ICONS[format];
          return (
            <DropdownMenuItem key={format} onSelect={() => onExport(format)}>
              <Icon className="h-4 w-4" /> {EXPORT_FORMATS[format].label} (
              {EXPORT_FORMATS[format].extension})
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
