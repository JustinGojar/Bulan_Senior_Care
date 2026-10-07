/**
 * Inline form validation: instead of the browser's built-in bubbles, the field
 * gets a red outline and a short message appears under it. FormValidation
 * applies this to every form that uses native `required`, `type="email"`,
 * `minLength` and similar attributes; forms that validate in code call
 * flagFieldById.
 */

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>';

export const flagged = new Map<HTMLElement, HTMLElement>();
/** Fields flagged by code-side checks; they stay flagged until edited. */
export const codeErrors = new WeakSet<HTMLElement>();
let nextId = 0;

/** The element people see: custom dropdowns keep a hidden native input next to a combobox button. */
function visibleTarget(field: HTMLElement) {
  if (field.getAttribute("aria-hidden") === "true" || field.tabIndex === -1) {
    const combobox = field.parentElement?.querySelector<HTMLElement>('[role="combobox"]');
    if (combobox) return combobox;
  }
  return field;
}

/** Where the message goes: after the field, or after its icon wrapper so icons stay centered. */
function anchorFor(target: HTMLElement) {
  const parent = target.parentElement;
  if (parent && parent.classList.contains("relative") && parent.tagName !== "FORM") return parent;
  return target;
}

function labelText(field: Control) {
  // Custom dropdowns: the hidden input has no label, the combobox button does.
  const target = visibleTarget(field);
  if (target !== field && target.id) {
    const text = document.querySelector(`label[for="${CSS.escape(target.id)}"]`)?.textContent;
    if (text) return text.replace(/[*:]/g, "").trim();
  }
  const label =
    field.labels?.[0]?.textContent ??
    (field.id ? document.querySelector(`label[for="${CSS.escape(field.id)}"]`)?.textContent : null);
  return label?.replace(/[*:]/g, "").trim() || null;
}

export function messageFor(field: Control) {
  const { validity } = field;
  const label = labelText(field);
  if (validity.valueMissing) {
    if (field instanceof HTMLSelectElement || field.getAttribute("aria-hidden") === "true")
      return label ? `Choose ${label.toLowerCase()}.` : "Choose an option.";
    if (field instanceof HTMLInputElement && field.type === "file")
      return label ? `${label} is required.` : "Attach a file.";
    if (field instanceof HTMLInputElement && field.type === "checkbox")
      return "Check this box to continue.";
    return label ? `${label} is required.` : "This field is required.";
  }
  if (validity.typeMismatch && field instanceof HTMLInputElement && field.type === "email")
    return "Enter a valid email address, like name@example.com.";
  if (validity.typeMismatch) return "Enter a valid value.";
  if (validity.tooShort && "minLength" in field)
    return `Use at least ${field.minLength} characters (now ${field.value.length}).`;
  if (validity.tooLong && "maxLength" in field) return `Use at most ${field.maxLength} characters.`;
  if (validity.patternMismatch) return field.title || "Use the requested format.";
  if (validity.rangeUnderflow && "min" in field) return `Enter ${field.min} or more.`;
  if (validity.rangeOverflow && "max" in field) return `Enter ${field.max} or less.`;
  if (validity.customError) return field.validationMessage;
  return field.validationMessage || "Check this field.";
}

/** Show an inline error under a field. Also used by forms that validate in code. */
export function showFieldError(field: HTMLElement, message: string) {
  clearFieldError(field);
  const target = visibleTarget(field);
  const id = `field-error-${++nextId}`;
  const node = document.createElement("p");
  node.id = id;
  node.className = "field-error";
  node.setAttribute("role", "alert");
  node.innerHTML = ICON;
  node.append(document.createTextNode(message));
  anchorFor(target).insertAdjacentElement("afterend", node);
  target.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-describedby", id);
  if (target !== field) field.setAttribute("aria-invalid", "true");
  flagged.set(field, node);
}

/** Swap the text of a message that is already showing (e.g. "required" becomes "invalid email"). */
export function updateMessage(field: HTMLElement, message: string) {
  const node = flagged.get(field);
  if (node && node.lastChild?.textContent !== message) node.lastChild!.textContent = message;
}

export function clearFieldError(field: HTMLElement) {
  const node = flagged.get(field);
  if (!node) return;
  const target = visibleTarget(field);
  node.remove();
  target.removeAttribute("aria-invalid");
  if (target.getAttribute("aria-describedby") === node.id)
    target.removeAttribute("aria-describedby");
  field.removeAttribute("aria-invalid");
  flagged.delete(field);
}

/** Bring the first flagged field into view and focus it. */
export function focusField(field: HTMLElement) {
  const target = visibleTarget(field);
  const rect = target.getBoundingClientRect();
  const onScreen = rect.top >= 0 && rect.bottom <= window.innerHeight;
  if (!onScreen) target.scrollIntoView({ block: "center", behavior: "smooth" });
  target.focus({ preventScroll: true });
}

export function isControl(node: EventTarget | null): node is Control {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLSelectElement ||
    node instanceof HTMLTextAreaElement
  );
}

/** Flag a field by id from code-side validation and move focus to it. */
export function flagFieldById(id: string, message: string): void {
  const field = document.getElementById(id);
  if (!field) return;
  codeErrors.add(field);
  showFieldError(field, message);
  focusField(field);
}

/** Flag several fields from code-side validation at once and focus the first one. */
export function flagFieldsById(errors: Array<[id: string, message: string]>): void {
  let first: HTMLElement | null = null;
  for (const [id, message] of errors) {
    const field = document.getElementById(id);
    if (!field) continue;
    codeErrors.add(field);
    showFieldError(field, message);
    first ??= field;
  }
  if (first) focusField(first);
}

/** Clear a code-side error, e.g. when a custom dropdown that fires no input event changes. */
export function clearFieldById(id: string): void {
  const field = document.getElementById(id);
  if (!field) return;
  codeErrors.delete(field);
  clearFieldError(field);
}
