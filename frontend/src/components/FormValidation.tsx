import { useEffect } from "react";
import {
  clearFieldError,
  codeErrors,
  flagged,
  focusField,
  isControl,
  messageFor,
  showFieldError,
  updateMessage,
} from "@/lib/form-validation";

/**
 * Replaces the browser's built-in validation bubbles with inline messages that
 * match the app design. Rendered once at the root.
 */
export function FormValidation() {
  useEffect(() => {
    let firstInvalid: HTMLElement | null = null;

    const handleInvalid = (event: Event) => {
      const field = event.target;
      if (!isControl(field)) return;
      event.preventDefault();
      showFieldError(field, messageFor(field));
      // Invalid events fire in field order during one submit (with microtasks
      // running between them), so wait a task and focus only the first.
      if (!firstInvalid) {
        firstInvalid = field;
        window.setTimeout(() => {
          if (firstInvalid) focusField(firstInvalid);
          firstInvalid = null;
        }, 0);
      }
    };

    // Re-check flagged fields after any edit. Custom dropdowns update their hidden
    // input from React state, so the check waits a tick after clicks too.
    const recheck = () =>
      window.setTimeout(() => {
        for (const field of [...flagged.keys()]) {
          if (!field.isConnected) {
            flagged.get(field)?.remove();
            flagged.delete(field);
          } else if (isControl(field) && !codeErrors.has(field)) {
            if (field.validity.valid) clearFieldError(field);
            else updateMessage(field, messageFor(field));
          }
        }
      }, 0);

    const handleEdit = (event: Event) => {
      const field = event.target;
      // Errors set in code clear as soon as that field is edited.
      if (field instanceof HTMLElement && codeErrors.has(field)) {
        codeErrors.delete(field);
        clearFieldError(field);
      }
      recheck();
    };

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleEdit, true);
    document.addEventListener("change", handleEdit, true);
    document.addEventListener("click", recheck, true);
    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", handleEdit, true);
      document.removeEventListener("change", handleEdit, true);
      document.removeEventListener("click", recheck, true);
    };
  }, []);

  return null;
}
