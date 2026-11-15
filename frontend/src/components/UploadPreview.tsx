import { useEffect, useState } from "react";

export function UploadPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!url) return null;

  const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  return (
    <div className="mt-2 min-w-0 space-y-2">
      {isImage ? (
        <a href={url} target="_blank" rel="noreferrer" aria-label={`Preview ${file.name}`}>
          <img
            src={url}
            alt={`Preview of ${file.name}`}
            className="max-h-56 max-w-full rounded-lg border border-border/60 object-contain"
          />
        </a>
      ) : isPdf ? (
        <object
          data={url}
          type="application/pdf"
          aria-label={`Preview of ${file.name}`}
          className="h-64 w-full rounded-lg border border-border/60"
        >
          <p className="p-3 text-sm text-muted-foreground">
            Open the file below to preview this PDF.
          </p>
        </object>
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block break-all text-xs font-semibold text-primary hover:underline"
      >
        Open preview: {file.name}
      </a>
    </div>
  );
}
