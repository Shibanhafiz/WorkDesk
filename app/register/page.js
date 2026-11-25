"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { useSession } from "../components/SessionProvider";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading: isSessionLoading, reload } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (name.trim().length < 2 || name.trim().length > 80) {
      errors.name = "Name must be between 2 and 80 characters.";
    }
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to create account.");
      }
      const session = await reload();
      router.replace(session?.user?.onboardingCompleted ? "/" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-heading">
        <p className="section-kicker">GET STARTED</p>
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Your personal workspace is created automatically.
        </p>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error auth-feedback">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="auth-field">
          <label className="field-label" htmlFor="register-name">Name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldErrors((current) => ({ ...current, name: "" }));
            }}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
            className="form-control"
          />
          {fieldErrors.name ? (
            <span id="register-name-error" className="field-error">
              {fieldErrors.name}
            </span>
          ) : null}
        </div>

        <div className="auth-field">
          <label className="field-label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
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
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            className="form-control"
          />
          {fieldErrors.email ? (
            <span id="register-email-error" className="field-error">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>

        <PasswordField
          id="register-password"
          label="Password (8+ characters)"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: "" }));
          }}
          autoComplete="new-password"
          placeholder="Choose a password"
          error={fieldErrors.password}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary auth-submit"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
