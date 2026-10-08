import { useEffect, useState } from "react";
import { loadPrivateFile } from "@/lib/api";

/** Object URL for a private API file, or null while it loads or when it cannot be loaded. */
export function usePrivateFile(path: string | null | undefined) {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;
    loadPrivateFile(path).then(
      (url) => active && setLoaded({ path, url }),
      () => active && setLoaded(null),
    );
    return () => {
      active = false;
    };
  }, [path]);

  return path && loaded?.path === path ? loaded.url : null;
}
