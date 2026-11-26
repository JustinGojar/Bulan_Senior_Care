import type { Senior } from "./osca-data";

/** Suggest only checks supported by the record, without claiming to inspect document contents. */
export function suggestedReviewNote(senior: Senior): string {
  const instructions: string[] = [];
  if (!senior.validIdPaths?.some(Boolean) && !senior.validIdPath && !senior.idDocumentPath) {
    instructions.push("Upload a clear copy of the senior's valid ID.");
  }
  if (!senior.birthCertificatePath) {
    instructions.push("Upload a clear copy of the senior's birth certificate.");
  }
  if (!senior.firstName?.trim() || !senior.lastName?.trim()) {
    instructions.push(
      "Complete the senior's first and last name to match the supporting documents.",
    );
  }
  if (!senior.birthdate || !Number.isFinite(Date.parse(senior.birthdate))) {
    instructions.push("Provide the correct birthdate shown on the supporting documents.");
  }
  return instructions.length
    ? instructions.join("\n")
    : "Please verify that the uploaded ID and birth certificate are clear and belong to the senior, and that the name and birthdate match the record. Submit corrected documents if needed.";
}

export function composeReviewNote(instructions: string, additional: string): string {
  return [instructions.trim(), additional.trim()].filter(Boolean).join("\n\n");
}
