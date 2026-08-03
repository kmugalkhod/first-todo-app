/**
 * Magic-link email delivery via Resend (Task 0002 decision).
 *
 * Uses the plain HTTPS API rather than a dedicated SDK to keep dependencies
 * light. When `RESEND_API_KEY` is absent (local dev without credentials) it
 * logs the verify URL instead of failing so the flow can still be exercised
 * in development.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "Taskspace <onboarding@resend.dev>";

export async function sendMagicLinkEmail({
  to,
  url,
}: {
  to: string;
  url: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(
      `[auth] RESEND_API_KEY not set — skipping magic-link email to ${to}. ` +
        `Verify with this dev link (10 min): ${url}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "Your Taskspace sign-in link",
      text: `Sign in to Taskspace with this link (expires in 10 minutes): ${url}`,
      html: `<p>Sign in to <strong>Taskspace</strong> with the link below. It expires in 10 minutes.</p><p><a href="${url}">Sign in to Taskspace</a></p>`,
    }),
  });

  if (!response.ok) {
    // Resend returns a JSON body with a human-readable reason (e.g. "You can
    // only send testing emails to your own email address while using the
    // @resend.dev domain"). Surface it instead of swallowing it.
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message ?? "";
    } catch {
      // non-JSON error body; fall back to status only
    }
    console.error(`[auth] Resend rejected the magic-link email:`, {
      status: response.status,
      detail,
      to,
    });
    throw new Error(
      detail || `Resend magic-link email failed (HTTP ${response.status})`,
    );
  }
}
