export function isGoogleOAuthConfigured() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_READY === "true" &&
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) &&
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL)
  );
}
