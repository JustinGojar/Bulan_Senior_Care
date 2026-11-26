import { describe, expect, it } from "vitest";
import type { Senior } from "../lib/osca-data";
import { composeReviewNote, suggestedReviewNote } from "../lib/review-suggestions";

const senior: Senior = {
  id: "OSCA-1",
  name: "Ana Reyes",
  firstName: "Ana",
  lastName: "Reyes",
  birthdate: "1950-01-01",
  age: 76,
  barangay: "Zone 1",
  address: "",
  contact: "",
  benefit: "Social Pension",
  status: "Pending",
};

describe("review instructions", () => {
  it("requests missing uploads without inventing document defects", () => {
    const note = suggestedReviewNote(senior);
    expect(note).toContain("Upload a clear copy of the senior's valid ID.");
    expect(note).toContain("Upload a clear copy of the senior's birth certificate.");
    expect(note).not.toContain("blurry");
    expect(note.length).toBeLessThanOrEqual(500);
  });

  it.each([
    { validIdPaths: ["id.jpg"] },
    { validIdPath: "id.jpg" },
    { idDocumentPath: "legacy.jpg" },
  ])("recognizes uploaded IDs including legacy records: %j", (ids) => {
    const note = suggestedReviewNote({ ...senior, ...ids, birthCertificatePath: "birth.pdf" });
    expect(note).toContain("Please verify");
    expect(note).not.toContain("Upload a clear copy");
  });

  it("requests missing names and an invalid birthdate", () => {
    const note = suggestedReviewNote({ ...senior, firstName: "", birthdate: "invalid" });
    expect(note).toContain("first and last name");
    expect(note).toContain("correct birthdate");
    expect(note.length).toBeLessThanOrEqual(500);
  });

  it("combines the edited instructions and optional Head message for delivery", () => {
    expect(composeReviewNote(" Upload the ID. ", " Please include all corners. ")).toBe(
      "Upload the ID.\n\nPlease include all corners.",
    );
    expect(composeReviewNote("Upload the ID.", "  ")).toBe("Upload the ID.");
    expect(composeReviewNote(" ", " ")).toBe("");
  });
});
