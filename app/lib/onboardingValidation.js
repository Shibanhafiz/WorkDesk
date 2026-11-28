const WORKSPACE_CHOICES = new Set(["personal", "team", "join"]);
const SPECIALIZATIONS = new Set(["DEVELOPER", "DESIGNER", "OTHER"]);

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return "";
  }
  return value;
}

function normalizeProject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    name: cleanString(value.name, 100),
    description: cleanString(value.description, 1000),
    startDate: cleanDate(value.startDate),
    dueDate: cleanDate(value.dueDate),
    initialTaskTitle: cleanString(value.initialTaskTitle, 100),
  };
}

export function normalizeOnboardingStep(value) {
  const step = typeof value === "number" ? value : Number(value);
  return Number.isInteger(step) && step >= 0 && step <= 3 ? step : null;
}

export function normalizeOnboardingData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const emails = Array.isArray(value.invitationEmails)
    ? value.invitationEmails
        .filter((email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        .map((email) => email.trim().toLowerCase())
        .slice(0, 20)
    : [];

  return {
    workspaceChoice: WORKSPACE_CHOICES.has(value.workspaceChoice)
      ? value.workspaceChoice
      : "",
    teamName: cleanString(value.teamName, 80),
    inviteToken: cleanString(value.inviteToken, 128),
    displayName: cleanString(value.displayName, 80),
    avatarUrl: cleanString(value.avatarUrl, 500),
    specialization: SPECIALIZATIONS.has(value.specialization)
      ? value.specialization
      : "",
    workspaceName: cleanString(value.workspaceName, 80),
    workspaceDescription: cleanString(value.workspaceDescription, 500),
    invitationEmails: emails,
    firstProject: normalizeProject(value.firstProject),
    skipped: {
      profile: value.skipped?.profile === true,
      invitations: value.skipped?.invitations === true,
      firstProject: value.skipped?.firstProject === true,
    },
  };
}

export function parseOnboardingData(raw) {
  if (!raw) return {};
  try {
    return normalizeOnboardingData(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function validateProfileInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const displayName = cleanString(input.displayName, 80);
  if (displayName && displayName.length < 2) {
    return { error: "Display name must be at least 2 characters." };
  }

  const avatarUrl = cleanString(input.avatarUrl, 500);
  if (avatarUrl && !/^https:\/\/\S+$/i.test(avatarUrl)) {
    return { error: "Profile image must be a valid http(s) URL." };
  }

  const specialization = input.specialization === "" || input.specialization === null
    ? null
    : input.specialization;
  if (specialization !== null && !SPECIALIZATIONS.has(specialization)) {
    return { error: "Choose a valid specialization." };
  }

  return { data: { displayName, avatarUrl: avatarUrl || null, specialization } };
}

export function validateWorkspaceChoiceInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }
  if (!WORKSPACE_CHOICES.has(input.choice)) {
    return { error: "Choose a valid workspace option." };
  }

  const data = { choice: input.choice };
  if (input.choice === "team") {
    data.name = cleanString(input.name, 80);
    data.description = cleanString(input.description, 500);
    if (!data.name) return { error: "Workspace name is required." };
  }
  if (input.choice === "join") {
    data.token = cleanString(input.token, 128);
    if (!data.token) return { error: "Invitation token is required." };
  }
  return { data };
}
