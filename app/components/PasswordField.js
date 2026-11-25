"use client";

import { useState } from "react";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  describedBy,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = error ? `${id}-error` : describedBy;

  return (
    <div className="auth-field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <span className="auth-password-wrap">
        <input
          id={id}
          name={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className="form-control"
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="auth-password-toggle"
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </span>
      {error ? (
        <span id={errorId} className="field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
