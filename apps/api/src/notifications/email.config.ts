export function emailConfig() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  let origin: string | undefined;
  try {
    const url = new URL(process.env.FRONTEND_URL ?? "");
    if (
      url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.protocol === "http:")
    )
      throw new Error();
    if (url.username || url.password) throw new Error();
    origin = url.origin;
  } catch {
    /* configuration remains unavailable */
  }
  const available = Boolean(
    key &&
    from &&
    !/[\r\n]/.test(from) &&
    /(?:^|<)[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from) &&
    secret &&
    origin,
  );
  return { available, key, from, secret, origin };
}

export const hashToken = async (token: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(token).digest("hex");
};
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
