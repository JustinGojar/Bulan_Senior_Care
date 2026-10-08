type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Value each edited field had before the user changed it. Weak, so fields that unmount
// (a closed dialog, a page left behind) don't linger here.
const baselines = new WeakMap<Field, string>();
const edited = new Set<Field>();
// Never matches a real value, for fields first seen mid-edit with no known starting value.
const UNKNOWN = "\u0000unknown";

function isField(target: EventTarget | null): target is Field {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Only fields that hold data being entered count: those inside a form or dialog. Search
 * boxes, filters and comboboxes are lookups, and a field can opt out with
 * `data-unsaved-ignore`.
 */
function isTracked(field: Field) {
  if (field instanceof HTMLInputElement) {
    if (["search", "hidden", "button", "submit", "reset"].includes(field.type)) return false;
  }
  if (field.getAttribute("role") === "combobox") return false;
  if (field.closest("[data-unsaved-ignore]")) return false;
  return Boolean(field.closest("form, [role='dialog']"));
}

function valueOf(field: Field) {
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio") return String(field.checked);
    if (field.type === "file") return Array.from(field.files ?? [], (file) => file.name).join("|");
  }
  return field.value;
}

function handleFocus(event: Event) {
  const field = event.target;
  if (!isField(field) || !isTracked(field) || baselines.has(field)) return;
  baselines.set(field, valueOf(field));
}

function handleEdit(event: Event) {
  const field = event.target;
  if (!isField(field) || !isTracked(field)) return;
  if (!baselines.has(field)) {
    // File pickers and checkboxes change without taking focus first.
    const startedEmpty = field instanceof HTMLInputElement && field.type === "file";
    baselines.set(field, startedEmpty ? "" : UNKNOWN);
  }
  edited.add(field);
}

// Submitting a form counts as saving it; its fields start fresh from what was sent.
function handleSubmit(event: Event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  for (const field of edited) {
    if (field.form !== form) continue;
    baselines.set(field, valueOf(field));
    edited.delete(field);
  }
}

/** Starts watching form fields for edits; returns a function that stops watching. */
export function trackUnsavedChanges() {
  document.addEventListener("focusin", handleFocus, true);
  // Only "input": text, selects, checkboxes and file pickers all fire it, while "change" also
  // fires on blur and would re-flag a field that was just submitted and cleared.
  document.addEventListener("input", handleEdit, true);
  document.addEventListener("submit", handleSubmit, true);
  return () => {
    document.removeEventListener("focusin", handleFocus, true);
    document.removeEventListener("input", handleEdit, true);
    document.removeEventListener("submit", handleSubmit, true);
    edited.clear();
  };
}

/** Whether a field still on screen holds a value the user typed and hasn't submitted. */
export function hasUnsavedChanges() {
  for (const field of edited) {
    if (!field.isConnected) {
      edited.delete(field);
      continue;
    }
    if (valueOf(field) !== baselines.get(field)) return true;
  }
  return false;
}
