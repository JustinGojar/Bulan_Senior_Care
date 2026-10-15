import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from "react";
import { usePrivateFile } from "@/lib/use-private-file";

type PrivateImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  path: string | null | undefined;
  /** Shown while the image loads or when it is unavailable. */
  fallback?: ReactNode;
};

export function PrivateImage({ path, fallback = null, alt = "", ...props }: PrivateImageProps) {
  const url = usePrivateFile(path);
  return url ? <img src={url} alt={alt} {...props} /> : <>{fallback}</>;
}

type PrivateFileLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  path: string | null | undefined;
};

/** Opens a private file in a new tab once it has loaded. */
export function PrivateFileLink({ path, children, ...props }: PrivateFileLinkProps) {
  const url = usePrivateFile(path);
  return (
    <a
      target="_blank"
      rel="noreferrer"
      {...props}
      href={url ?? undefined}
      aria-disabled={!url}
      onClick={(event) => {
        if (!url) event.preventDefault();
        props.onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

type PrivatePdfPreviewProps = {
  path: string | null | undefined;
  title: string;
  className?: string;
};

/** Shows the first page of a private PDF as a thumbnail; it ignores clicks so a wrapping link still opens the file. */
export function PrivatePdfPreview({ path, title, className = "" }: PrivatePdfPreviewProps) {
  const url = usePrivateFile(path);
  return (
    <span className={`relative block overflow-hidden bg-white ${className}`}>
      {url && (
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={title}
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
        />
      )}
    </span>
  );
}
