"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to process that request.");
      }
      setResult({ devToken: data.devToken ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process that request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-heading">
        <p className="section-kicker">ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p className="auth-subtitle">
          Enter the email on your account and we will send a reset link.
        </p>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error auth-feedback">
          {error}
        </p>
      ) : null}

      {result ? (
        <div role="status" className="feedback auth-feedback">
          <p>
            If an account exists for that email, a reset link is on its way.
            The link expires in one hour.
          </p>
          {result.devToken ? (
            <p className="auth-dev-token">
              Development mode:{" "}
              <Link
                className="auth-link"
                href={`/reset-password?token=${result.devToken}`}
              >
                open your reset link
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label className="field-label" htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="form-control"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-primary auth-submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="auth-footer">
        <Link href="/login" className="auth-link">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
