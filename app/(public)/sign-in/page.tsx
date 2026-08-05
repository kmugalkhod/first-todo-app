"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

/**
 * Return a same-origin relative path for the post-sign-in redirect, or
 * `undefined` iff the value is unsafe (external URL / protocol-relative), so an
 * attacker-supplied `next` can never become an open redirect.
 */
function safeRelativeNext(raw: string | null): string | undefined {
  if (!raw) return undefined;
  // Reject protocol-relative and absolute-URL values.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) || raw.startsWith("//")) {
    return undefined;
  }
  // Must be a path on the app origin.
  if (!raw.startsWith("/")) return undefined;
  return raw;
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = safeRelativeNext(searchParams.get("next"));
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const { data: session, isPending } = authClient.useSession();

  React.useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function submitMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await authClient.signIn.magicLink({
      email,
      // Continue a signed-out invitee (or a brand-new account) back to the
      // invitation link after they authenticate (Task 0203).
      ...(callback ? { callbackURL: callback, newUserCallbackURL: callback } : {}),
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  if (isPending) return null;

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--taskspace-canvas)] px-4 py-8 sm:p-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-[var(--taskspace-radius-dialog)] border border-border bg-[var(--taskspace-paper)] shadow-[var(--taskspace-shell-shadow)] md:grid md:grid-cols-[0.9fr_1fr] md:rounded-[var(--taskspace-radius-shell)]">
        <section className="hidden min-h-[560px] flex-col justify-between bg-[var(--taskspace-cobalt)] p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-3 text-sm font-extrabold tracking-[-0.04em]">
              <span className="relative flex size-8 items-center justify-center" aria-hidden="true">
                <span className="absolute size-4 rotate-45 rounded-[var(--taskspace-radius-chip)] bg-[var(--taskspace-citron)]" />
                <span className="relative size-2.5 rounded-full bg-[var(--taskspace-cobalt)] ring-2 ring-white/80" />
              </span>
              Taskspace
            </div>
            <h1 className="mt-[var(--taskspace-space-content)] max-w-sm font-heading text-[clamp(2.5rem,5vw,4.5rem)] font-[var(--taskspace-weight-display)] leading-[0.94] tracking-[var(--taskspace-tracking-display)]">
              Make the next move clear.
            </h1>
          </div>
          <p className="ts-body max-w-xs text-white/75">
            A shared workboard for the decisions, owners, and next steps that keep a project moving.
          </p>
        </section>
        <div className="w-full p-6 sm:p-10 md:flex md:min-h-[560px] md:flex-col md:justify-center">
        <p className="text-[length:var(--taskspace-font-size-micro)] font-[var(--taskspace-weight-label)] uppercase tracking-[var(--taskspace-tracking-label)] text-[var(--taskspace-cobalt)] md:hidden">Taskspace</p>
        <h2 className="ts-display mt-[var(--taskspace-space-control)] md:mt-0">
          {sent ? "Check your inbox" : "Sign in"}
        </h2>
        <p className="ts-body mt-[var(--taskspace-space-control)]">
          {sent
            ? "We emailed you a sign-in link. It expires in 10 minutes."
            : "Enter your email and we will send you a magic link to sign in."}
        </p>

        {sent ? (
          <Button type="button" variant="ghost" className="mt-[var(--taskspace-space-section)] w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        ) : (
          <form onSubmit={submitMagicLink} className="mt-[var(--taskspace-space-section)] flex flex-col gap-[var(--taskspace-space-compact)]">
            <div className="flex flex-col gap-[var(--taskspace-space-tight)]">
              <Label htmlFor="email" className="ts-label">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-[var(--taskspace-radius-input)] px-3.5"
              />
            </div>
            {error ? (
              <p role="alert" className="ts-body text-[var(--taskspace-priority-p1-ink)]">{error}</p>
            ) : null}
            <Button type="submit" disabled={loading} className="h-11 rounded-[var(--taskspace-radius-control)]">
              {loading ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        )}

        {GOOGLE_ENABLED ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={googleLoading}
              onClick={signInWithGoogle}
              className="w-full rounded-[var(--taskspace-radius-control)]"
            >
              Continue with Google
            </Button>
          </>
        ) : null}
        </div>
      </div>
    </main>
  );
}
