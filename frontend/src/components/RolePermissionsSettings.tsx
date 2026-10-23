import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthAlert } from "@/components/AuthLayout";
import {
  getRolePermissions,
  updateRolePermissions,
  type Permission,
  type RolePermissionsState,
} from "@/lib/api";

const ROLE_LABEL = { head: "OSCA Head", leader: "BSCA President (Barangay Leader)" } as const;

const ROW_CLASS =
  "flex min-h-[68px] items-center gap-4 rounded-[8px] border border-border/50 bg-card/80 px-4 py-3 sm:px-5";

/** Admin Settings: turn each permission on or off for the Head and the barangay leaders. */
export function RolePermissionsSettings() {
  const [state, setState] = useState<RolePermissionsState | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getRolePermissions()
      .then(setState)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load permissions."),
      );
  }, []);

  async function toggle(role: "head" | "leader", permission: Permission) {
    if (!state) return;
    const granted = state.roles[role];
    const next = granted.includes(permission)
      ? granted.filter((item) => item !== permission)
      : [...granted, permission];
    setSaving(`${role}:${permission}`);
    setError("");
    try {
      setState(await updateRolePermissions(role, next));
      toast.success(
        `${ROLE_LABEL[role]} permissions saved. They apply on the user's next sign-in or page reload.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save permissions.");
    } finally {
      setSaving(null);
    }
  }

  if (error && !state) return <AuthAlert tone="error">{error}</AuthAlert>;
  if (!state)
    return (
      <div className={`${ROW_CLASS} text-sm text-muted-foreground`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions…
      </div>
    );

  return (
    <div className="space-y-5">
      {(["head", "leader"] as const).map((role) => (
        <div key={role}>
          <p className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {ROLE_LABEL[role]}
          </p>
          <div className="space-y-1">
            {state.permissions
              .filter((permission) => permission.roles.includes(role))
              .map((permission) => {
                const on = state.roles[role].includes(permission.key);
                const busy = saving === `${role}:${permission.key}`;
                return (
                  <div key={permission.key} className={ROW_CLASS}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{permission.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${permission.label} for ${ROLE_LABEL[role]}`}
                      aria-busy={busy}
                      disabled={saving !== null}
                      onClick={() => void toggle(role, permission.key)}
                      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-navy dark:bg-gold dark:bg-none" : "bg-muted-foreground/40"}`}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5" : ""}`}
                      >
                        {on && <Check className="h-3 w-3 text-gold-foreground" />}
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
    </div>
  );
}
