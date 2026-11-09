
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Page } from "../data";

interface Props {
  navigate: (page: Page) => void;
}

type AuthMode = "signin" | "signup";

export default function CustomerAuthPage({ navigate }: Props) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function ensureCustomerProfile(user: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
  }) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? email.trim(),
          full_name:
            user.user_metadata?.full_name ?? name.trim(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      throw new Error(
        `Signed in, but the profile could not be saved: ${profileError.message}`
      );
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanEmail = email.trim().toLowerCase();

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const { data, error: signupError } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: name.trim() },
            },
          });

        if (signupError) throw signupError;

        if (data.session && data.user) {
          await ensureCustomerProfile(data.user);
          navigate("profile");
        } else {
          setNotice(
            "Account created. Check your email to confirm your account, then sign in."
          );
          setMode("signin");
        }
      } else {
        const { data, error: signinError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (signinError) throw signinError;
        if (!data.user) {
          throw new Error("Sign-in succeeded without a user account.");
        }

        await ensureCustomerProfile(data.user);
        navigate("profile");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="mb-5 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        >
          ← Back to BiteGo
        </button>

        <h1 className="text-2xl font-extrabold text-[var(--foreground)]">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {mode === "signin"
            ? "Sign in to see your profile and order history."
            : "Create an account to manage your profile and saved addresses."}
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block text-sm font-semibold">
              Full name
              <input
                name="full_name"
                autoComplete="name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-3 font-normal"
                placeholder="Your full name"
              />
            </label>
          )}

          <label className="block text-sm font-semibold">
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-3 font-normal"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-semibold">
            Password
            <input
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-3 font-normal"
              placeholder="At least 8 characters"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          {mode === "signin"
            ? "New to BiteGo?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="font-bold text-[var(--primary)]"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
