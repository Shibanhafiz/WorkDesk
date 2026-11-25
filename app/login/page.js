"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { useSession } from "../components/SessionProvider";
import { isGoogleOAuthConfigured } from "../lib/oauthConfig";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: isSessionLoading, reload } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.replace(user.onboardingCompleted ? "/" : "/onboarding");
    }
  }, [isSessionLoading, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const errors = {};
    if (!isValidEmail(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, remember }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in.");
      }
      const session = await reload();
      router.replace(session?.user?.onboardingCompleted ? "/" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-heading">
        <p className="section-kicker">WELCOME BACK</p>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to pick up where your team left off.
        </p>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error auth-feedback">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="auth-field">
          <label className="field-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: "" }));
            }}
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            className="form-control"
          />
          {fieldErrors.email ? (
            <span id="login-email-error" className="field-error">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: "" }));
          }}
          autoComplete="current-password"
          placeholder="Your password"
          error={fieldErrors.password}
        />

        <div className="auth-row">
          <label className="auth-check" htmlFor="login-remember">
            <input
              id="login-remember"
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary auth-submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {isGoogleOAuthConfigured() ? (
        <>
          <div className="auth-divider">or</div>
          <a
            href={process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL}
            className="button-secondary auth-submit"
          >
            <span aria-hidden="true" className="auth-google-mark">G</span>
            Continue with Google
          </a>
        </>
      ) : null}

      <p className="auth-footer">
        No account?{" "}
        <Link href="/register" className="auth-link">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
