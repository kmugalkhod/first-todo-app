"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

export default function SignInPage() {
  const router = useRouter();
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
    const { error: signInError } = await authClient.signIn.magicLink({ email });
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
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Taskspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          {sent ? "Check your inbox" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {sent
            ? "We emailed you a sign-in link. It expires in 10 minutes."
            : "Enter your email and we will send you a magic link to sign in."}
        </p>

        {sent ? (
          <Button type="button" variant="ghost" className="mt-6 w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        ) : (
          <form onSubmit={submitMagicLink} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-xl px-3.5"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" disabled={loading} className="h-11 rounded-xl">
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
              className="w-full rounded-xl"
            >
              Continue with Google
            </Button>
          </>
        ) : null}
      </div>
    </main>
  );
}
