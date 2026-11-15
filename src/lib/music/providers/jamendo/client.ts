import "server-only";

const JAMENDO_BASE_URL = "https://api.jamendo.com/v3.0";
const DEFAULT_TIMEOUT_MS = 8000;

export type JamendoErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "API_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR";

export class JamendoError extends Error {
  code: JamendoErrorCode;
  statusCode?: number;

  constructor(
    message: string,
    code: JamendoErrorCode,
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
 * Maps documented Jamendo API response codes (https://developer.jamendo.com/v3.0/response-codes)
 * to sanitized, typed JamendoError instances without exposing credentials or internal exceptions.
 */
function handleJamendoApiCode(code: number): never {
  switch (code) {
    case 1:
      throw new JamendoError(
        "Jamendo API error: generic upstream exception occurred",
        "API_ERROR",
        502
      );
    case 2:
      throw new JamendoError(
        "Jamendo API error: unsupported HTTP method",
        "API_ERROR",
        502
      );
    case 3:
      throw new JamendoError(
        "Jamendo API error: invalid query parameter value",
        "API_ERROR",
        502
      );
    case 4:
      throw new JamendoError(
        "Jamendo API error: required parameter missing",
        "API_ERROR",
        502
      );
    case 5:
      throw new JamendoError(
        "Jamendo API client ID is invalid. Please check your JAMENDO_CLIENT_ID configuration.",
        "INVALID_CREDENTIALS",
        503
      );
    case 6:
      throw new JamendoError(
        "Jamendo API rate limit exceeded. Please try again shortly.",
        "RATE_LIMITED",
        429
      );
    case 7:
      throw new JamendoError(
        "Jamendo API error: requested method not found",
        "API_ERROR",
        502
      );
    case 8:
      throw new JamendoError(
        "Jamendo API error: required conditional parameter missing",
        "API_ERROR",
        502
      );
    case 9:
      throw new JamendoError(
        "Jamendo API error: invalid response format",
        "API_ERROR",
        502
      );
    case 10:
      throw new JamendoError(
        "Jamendo API error: invalid API entry point",
        "API_ERROR",
        502
      );
    case 11:
      throw new JamendoError(
        "Jamendo developer application is suspended. Please verify your application status at developer.jamendo.com.",
        "INVALID_CREDENTIALS",
        503
      );
    default:
      throw new JamendoError(
        `Jamendo API error: upstream operation failed (code ${code})`,
        "API_ERROR",
        502
      );
  }
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

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new JamendoError(
        `Jamendo API responded with HTTP ${response.status}`,
        "API_ERROR",
        response.status
      );
    }
    throw new JamendoError(
      "Malformed JSON response received from Jamendo API",
      "API_ERROR",
      502
    );
  }

  // Inspect Jamendo headers status and code per official documentation:
  // Status must be documented "succeed" or official example "success" on success, or "failed" on error.
  // Code 0 indicates success. Any non-zero code is an API failure.
  if (
    typeof data === "object" &&
    data !== null &&
    "headers" in data &&
    typeof (data as { headers?: unknown }).headers === "object" &&
    (data as { headers?: unknown }).headers !== null &&
    !Array.isArray((data as { headers?: unknown }).headers)
  ) {
    const rawHeaders = (data as {
      headers: { status?: unknown; code?: unknown; error_message?: unknown };
    }).headers;

    // 1. Validate response code: must be a finite integer number
    if (typeof rawHeaders.code !== "number" || !Number.isInteger(rawHeaders.code)) {
      throw new JamendoError(
        "Malformed API response: missing or malformed response code from Jamendo API",
        "API_ERROR",
        502
      );
    }
    const code = rawHeaders.code;

    // 2. Validate status: must be a non-empty string
    if (typeof rawHeaders.status !== "string" || rawHeaders.status.trim() === "") {
      throw new JamendoError(
        "Malformed API response: missing or blank status in response headers from Jamendo API",
        "API_ERROR",
        502
      );
    }
    const statusStr = rawHeaders.status.toLowerCase().trim();

    // 3. Handle non-zero response codes (API failure codes 1-11, etc.)
    if (code !== 0) {
      handleJamendoApiCode(code);
    }

    // 4. When code is 0:
    // If status is "failed", reject as upstream failure
    if (statusStr === "failed") {
      throw new JamendoError(
        "Jamendo API error: upstream operation failed",
        "API_ERROR",
        502
      );
    }

    // Status must be documented "succeed" or official example "success"
    if (statusStr !== "succeed" && statusStr !== "success") {
      throw new JamendoError(
        `Malformed API response: unrecognized status value "${statusStr}" in response headers from Jamendo API`,
        "API_ERROR",
        502
      );
    }

    // Valid successful response: code === 0 and status in ("succeed", "success")
  } else if (!response.ok) {
    throw new JamendoError(
      `Jamendo API responded with HTTP ${response.status}`,
      "API_ERROR",
      response.status
    );
  } else {
    // Missing or invalid headers object on HTTP OK response
    throw new JamendoError(
      "Malformed API response: missing or invalid headers from Jamendo API",
      "API_ERROR",
      502
    );
  }

  if (!response.ok) {
    throw new JamendoError(
      `Jamendo API responded with HTTP ${response.status}`,
      "API_ERROR",
      response.status
    );
  }

  return data as T;
}
