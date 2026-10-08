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
