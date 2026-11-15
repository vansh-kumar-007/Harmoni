import "server-only";

const JAMENDO_BASE_URL = "https://api.jamendo.com/v3.0";
const DEFAULT_TIMEOUT_MS = 8000;

export class JamendoError extends Error {
  code: "NOT_CONFIGURED" | "RATE_LIMITED" | "API_ERROR" | "TIMEOUT" | "NETWORK_ERROR";
  statusCode?: number;

  constructor(
    message: string,
    code: "NOT_CONFIGURED" | "RATE_LIMITED" | "API_ERROR" | "TIMEOUT" | "NETWORK_ERROR",
    statusCode?: number
  ) {
    super(message);
    this.name = "JamendoError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Checks whether the server-side JAMENDO_CLIENT_ID environment variable is configured.
 */
export function isJamendoConfigured(): boolean {
  const clientId = process.env.JAMENDO_CLIENT_ID?.trim();
  return Boolean(clientId && clientId !== "your_free_jamendo_client_id_here");
}

/**
 * Retrieves the Jamendo client ID from the environment.
 * Throws JamendoError("NOT_CONFIGURED") if missing or unconfigured.
 */
export function getJamendoClientId(): string {
  const clientId = process.env.JAMENDO_CLIENT_ID?.trim();
  if (!clientId || clientId === "your_free_jamendo_client_id_here") {
    throw new JamendoError(
      "Jamendo API client ID is not configured on the server",
      "NOT_CONFIGURED",
      503
    );
  }
  return clientId;
}

export interface FetchJamendoOptions {
  endpoint: "tracks" | "artists" | "albums";
  params: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

/**
 * Executes a read-only request to the Jamendo v3.0 API.
 * Guarantees that the client_id is never leaked in client bundles or log outputs.
 */
export async function fetchFromJamendo<T>(options: FetchJamendoOptions): Promise<T> {
  const clientId = getJamendoClientId();

  const searchParams = new URLSearchParams();
  searchParams.set("client_id", clientId);
  searchParams.set("format", "json");

  for (const [key, value] of Object.entries(options.params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const endpointPath = options.endpoint.endsWith("/")
    ? options.endpoint
    : `${options.endpoint}/`;
  const targetUrl = `${JAMENDO_BASE_URL}/${endpointPath}?${searchParams.toString()}`;

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new JamendoError(
        "Jamendo API request timed out",
        "TIMEOUT",
        504
      );
    }
    throw new JamendoError(
      "Network failure connecting to Jamendo API",
      "NETWORK_ERROR",
      502
    );
  }

  if (response.status === 429) {
    throw new JamendoError(
      "Jamendo API rate limit exceeded. Please try again shortly.",
      "RATE_LIMITED",
      429
    );
  }

  if (!response.ok) {
    throw new JamendoError(
      `Jamendo API responded with HTTP ${response.status}`,
      "API_ERROR",
      response.status
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new JamendoError(
      "Malformed JSON response received from Jamendo API",
      "API_ERROR",
      502
    );
  }

  // Inspect Jamendo headers status and code
  if (
    typeof data === "object" &&
    data !== null &&
    "headers" in data &&
    typeof (data as { headers?: unknown }).headers === "object"
  ) {
    const headers = (data as { headers: { status?: string; code?: number; error_message?: string } }).headers;
    if (headers && headers.status === "failed") {
      const code = headers.code ?? -1;
      const msg = headers.error_message || "Unknown Jamendo API error";
      if (code === 4 || code === 2 || response.status === 429) {
        throw new JamendoError(
          "Jamendo API rate limit exceeded. Please try again shortly.",
          "RATE_LIMITED",
          429
        );
      }
      throw new JamendoError(
        `Jamendo API error (${code}): ${msg}`,
        "API_ERROR",
        502
      );
    }
  }

  return data as T;
}
