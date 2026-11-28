const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 120;
const MAX_LINKS_PER_TASK = 10;

function isJsonObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_URL_LENGTH) return null;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return candidate;
}

export function validateTaskLinkInput(input) {
  if (!isJsonObject(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const url = normalizeHttpUrl(input.url);
  if (!url) {
    return {
      error: "Link must be a valid http(s) URL of at most 2,048 characters.",
    };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: "Link title must be 120 characters or fewer." };
  }

  return { data: { url, title: title || null } };
}

export function validateTaskLinks(value) {
  if (!Array.isArray(value)) {
    return { error: "Links must be an array of URLs." };
  }
  if (value.length > MAX_LINKS_PER_TASK) {
    return { error: "A task can have at most 10 links." };
  }

  const urls = [];
  for (const item of value) {
    const url = normalizeHttpUrl(item);
    if (!url) {
      return {
        error:
          "Each link must be a valid http(s) URL of at most 2,048 characters.",
      };
    }
    urls.push(url);
  }

  return { data: urls };
}
