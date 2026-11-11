import { Check, Loader2, Save } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AuthAlert } from "@/components/AuthLayout";
import {
  getSystemRolePermissions,
  updateSystemRolePermissions,
  type SystemPermission,
  type SystemRolePermissionsState,
} from "@/lib/api";
import { panelClass } from "@/components/design-kit";

const EDITABLE_ROLES = ["head", "encoder", "viewer", "president"] as const;
type EditableRole = (typeof EDITABLE_ROLES)[number];
type RoleGrants = Record<EditableRole, SystemPermission[]>;

const MODULE_LABELS: Record<string, string> = {
  seniors: "Senior records",
  barangays: "Barangays",
  lookups: "Dropdown values",
  users: "Users",
  roles: "Roles",
  "audit-logs": "Audit logs",
  "security-settings": "Security settings",
};

function sorted(values: SystemPermission[]) {
  return [...values].sort();
}

function sameGrants(left: RoleGrants, right: RoleGrants) {
  return EDITABLE_ROLES.every(
    (role) => JSON.stringify(sorted(left[role])) === JSON.stringify(sorted(right[role])),
  );
}

function editableRoleGrants(state: SystemRolePermissionsState): RoleGrants {
  return {
    head: state.roles.head.permissions,
    encoder: state.roles.encoder.permissions,
    viewer: state.roles.viewer.permissions,
    president: state.roles.president.permissions,
  };
}

export function SystemRolePermissionsSettings() {
  const [state, setState] = useState<SystemRolePermissionsState | null>(null);
  const [grants, setGrants] = useState<RoleGrants | null>(null);
  const [savedGrants, setSavedGrants] = useState<RoleGrants | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSystemRolePermissions()
      .then((result) => {
        setState(result);
        const roleGrants = editableRoleGrants(result);
        setGrants(roleGrants);
        setSavedGrants(roleGrants);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not load role permissions."),
      );
  }, []);

  const modules = useMemo(
    () => [...new Set(state?.permissions.map((permission) => permission.module) ?? [])],
    [state],
  );

  function toggle(role: EditableRole, permission: SystemPermission) {
    setGrants((current) => {
      if (!current) return current;
      const currentRole = current[role];
      return {
        ...current,
        [role]: currentRole.includes(permission)
          ? currentRole.filter((value) => value !== permission)
          : [...currentRole, permission],
      };
    });
  }

  async function save() {
    if (!grants) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateSystemRolePermissions(grants);
      const roleGrants = editableRoleGrants(result);
      setState(result);
      setGrants(roleGrants);
      setSavedGrants(roleGrants);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save role permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !state) return <AuthAlert tone="error">{error}</AuthAlert>;
  if (!state || !grants || !savedGrants) {
    return (
      <div className={`${panelClass} flex items-center gap-2 p-5 text-sm text-muted-foreground`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading role permissions…
      </div>
    );
  }

  return (
    <section className={`${panelClass} p-4 sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Permissions matrix</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Super Admin permissions are locked. Other role changes apply on the user’s next request.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || sameGrants(grants, savedGrants)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gold dark:text-gold-foreground"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save permissions
        </button>
      </div>
      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="sticky left-0 bg-muted px-4 py-3">Permission</th>
              {Object.entries(state.roles).map(([role, roleInfo]) => (
                <th key={role} className="px-3 py-3 text-center">
                  {roleInfo.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <Fragment key={module}>
                <tr key={`${module}-heading`} className="border-t border-border/60 bg-muted/40">
                  <th
                    colSpan={Object.keys(state.roles).length + 1}
                    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  >
                    {MODULE_LABELS[module] ?? module}
                  </th>
                </tr>
                {state.permissions
                  .filter((permission) => permission.module === module)
                  .map((permission) => (
                    <tr key={permission.key} className="border-t border-border/40">
                      <td className="sticky left-0 bg-card px-4 py-3">{permission.label}</td>
                      {Object.entries(state.roles).map(([role, roleInfo]) => {
                        const editableRole = EDITABLE_ROLES.find((candidate) => candidate === role);
                        const checked =
                          roleInfo.locked ||
                          (editableRole ? grants[editableRole].includes(permission.key) : false);
                        return (
                          <td key={role} className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={roleInfo.locked || !editableRole || saving}
                              aria-label={`${permission.label} for ${roleInfo.label}`}
                              onChange={() => {
                                if (editableRole) toggle(editableRole, permission.key);
                              }}
                              className="h-4 w-4 accent-[var(--color-navy)] disabled:cursor-not-allowed"
                            />
                            {roleInfo.locked && <Check className="sr-only" aria-hidden="true" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
