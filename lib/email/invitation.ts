/**
 * Invitation email delivery via Resend (Task 0002 decision, Task 0203).
 *
 * Mirrors `lib/email/magic-link.ts`: plain HTTPS API, no extra dependency.
 * When `RESEND_API_KEY` is absent (local dev without credentials) the accept
 * link is logged instead of failing so the loop can still be exercised.
 *
 * Note: Resend's free `@resend.dev` sender can only deliver to the verified
 * account email, so in dev you may need to invite that own address (the magic
 * link flow has the same constraint).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "Taskspace <onboarding@resend.dev>";

/** The public origin of the app, used to build the emailed accept link. */
export const APP_ORIGIN =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const ROLE_LABEL: Record<"editor" | "viewer", string> = {
  editor: "an Editor (can edit tasks, sections and labels)",
  viewer: "a Viewer (can view — read-only)",
};

export async function sendInvitationEmail({
  to,
  url,
  projectName,
  inviterName,
  role,
}: {
  to: string;
  url: string;
  projectName: string;
  inviterName: string;
  role: "editor" | "viewer";
}): Promise<void> {
  // Build the accept link from a relative path + origin so the email always
  // resolves against the configured public origin.
  const acceptUrl = url.startsWith("http")
    ? url
    : `${APP_ORIGIN.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;

  if (!RESEND_API_KEY) {
    console.warn(
      `[auth] RESEND_API_KEY not set — skipping invitation email to ${to}. ` +
        `Share this accept link (7-day, single-use): ${acceptUrl}`,
    );
    return;
  }

  const body = {
    from: FROM_EMAIL,
    to: [to],
    subject: `You're invited to join "${projectName}" on Taskspace`,
    text: `${inviterName} invited you to join the project "${projectName}" as ${ROLE_LABEL[role]}. Accept your invitation (this link is single-use and expires in 7 days): ${acceptUrl}`,
    html: `<p><strong>${inviterName}</strong> invited you to join the Taskspace project <strong>${projectName}</strong> as ${ROLE_LABEL[role]}.</p><p>The link below is <em>single-use</em> and expires in <strong>7 days</strong>.</p><p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#3543d6;color:#fff;text-decoration:none;font-weight:600;">Accept invitation</a></p><p style="color:#69718d;font-size:12px;">If you didn't expect this invitation, you can safely ignore it.</p>`,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const parsed = (await response.json()) as { message?: string };
      detail = parsed.message ?? "";
    } catch {
      // non-JSON error body; fall back to status only
    }
    console.error(`[auth] Resend rejected the invitation email:`, {
      status: response.status,
      detail,
      to,
      projectName,
    });
    throw new Error(
      detail || `Resend invitation email failed (HTTP ${response.status})`,
    );
  }
}
