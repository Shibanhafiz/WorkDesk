"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";

export default function ResetPasswordPage() {
  const tokenRef = useRef("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    tokenRef.current = new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const token = tokenRef.current;
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError("This reset link is invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to reset your password.");
      }
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="auth-heading">
        <p className="section-kicker">ACCOUNT RECOVERY</p>
        <h1>{isComplete ? "Password updated" : "Choose a new password"}</h1>
        <p className="auth-subtitle">
          {isComplete
            ? "You can sign in with your new password."
            : "Use a password of at least eight characters."}
        </p>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error auth-feedback">
          {error}
        </p>
      ) : null}

      {isComplete ? (
        <Link href="/login" className="button-primary auth-submit auth-action-link">
          Sign in
        </Link>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Choose a new password"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-primary auth-submit"
          >
            {isSubmitting ? "Updating..." : "Update password"}
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
