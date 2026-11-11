/** Permission/network failures keep the session; an unverified email ends it. */
export function isRejectedSession(status: number, body: unknown) {
  return (
    status === 401 ||
    (status === 403 &&
      typeof body === "object" &&
      body !== null &&
      "email_unverified" in body &&
      body.email_unverified === true)
  );
}
