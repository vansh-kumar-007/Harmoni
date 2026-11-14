import "server-only";
import { NextResponse } from "next/server";

/**
 * Maximum permitted request body size: 64 KiB (65,536 bytes).
 */
export const MAX_REQUEST_BODY_BYTES = 64 * 1024;

/**
 * Custom HTTP error class carrying an HTTP status code.
 */
export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Validates that the Content-Type header matches the expected media type,
 * properly ignoring parameters such as charset (e.g. 'application/json; charset=utf-8').
 *
 * Rejects invalid media types such as 'application/jsonp' or 'text/plain'.
 *
 * @param contentTypeHeader Incoming Content-Type header value
 * @param expectedMediaType Expected media type (defaults to 'application/json')
 * @returns true if valid match, false otherwise
 */
export function isContentType(
  contentTypeHeader: string | null,
  expectedMediaType = "application/json"
): boolean {
  if (!contentTypeHeader) {
    return false;
  }
  const [mediaType] = contentTypeHeader.split(";");
  return mediaType.trim().toLowerCase() === expectedMediaType.toLowerCase();
}

/**
 * Safely reads the raw request body stream up to maxBytes.
 * Enforces the size limit on actual bytes read from the stream,
 * even when Content-Length is missing or falsified.
 *
 * Cancels the reader immediately if the limit is exceeded to prevent resource exhaustion.
 *
 * @param request Incoming Web Fetch API Request
 * @param maxBytes Maximum allowable bytes (default 64 KiB)
 * @returns The body as a UTF-8 string, or null if the body is empty
 */
export async function readRequestBodyText(
  request: Request,
  maxBytes = MAX_REQUEST_BODY_BYTES
): Promise<string | null> {
  // Early rejection via Content-Length header if present
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > maxBytes) {
      throw new HttpError("Payload too large: maximum size is 64 KiB", 413);
    }
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        // Cancel reader immediately to prevent further socket consumption
        await reader.cancel("Payload too large").catch(() => {});
        throw new HttpError("Payload too large: maximum size is 64 KiB", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (chunks.length === 0) {
    return null;
  }

  const decoder = new TextDecoder("utf-8");
  let text = "";
  for (const chunk of chunks) {
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();

  return text.trim().length === 0 ? null : text;
}

/**
 * Reads and parses a required JSON object from the request.
 * Strictly requires 'application/json' (with optional parameters like charset=utf-8)
 * and enforces the 64 KiB maximum body size.
 *
 * @param request Incoming Request
 * @param maxBytes Maximum allowable bytes
 * @returns Parsed JSON object
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = MAX_REQUEST_BODY_BYTES
): Promise<T> {
  const contentType = request.headers.get("content-type");
  if (!isContentType(contentType, "application/json")) {
    throw new HttpError("Unsupported Media Type: application/json is required", 415);
  }

  const rawText = await readRequestBodyText(request, maxBytes);
  if (!rawText) {
    throw new HttpError("Malformed JSON payload: request body is empty", 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new HttpError("Malformed JSON payload", 400);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError("Invalid JSON payload: JSON object expected", 400);
  }

  return parsed as T;
}

/**
 * Reads and parses an optional JSON object from the request.
 * If the body is genuinely empty (null body or 0 bytes read), returns fallback.
 * If a body is provided, strictly requires 'application/json' and valid JSON syntax.
 *
 * Prevents accidentally accepting non-JSON or malformed bodies on optional endpoints.
 *
 * @param request Incoming Request
 * @param fallback Value to return if body is empty (default empty object)
 * @param maxBytes Maximum allowable bytes
 * @returns Parsed JSON object or fallback
 */
export async function parseOptionalJsonBody<T = Record<string, unknown>>(
  request: Request,
  fallback: T = {} as T,
  maxBytes = MAX_REQUEST_BODY_BYTES
): Promise<T> {
  // Check Content-Length if explicitly 0
  const contentLength = request.headers.get("content-length");
  if (contentLength === "0") {
    return fallback;
  }

  const rawText = await readRequestBodyText(request, maxBytes);
  if (!rawText) {
    // Body is genuinely empty
    return fallback;
  }

  // A body was provided: strictly validate Content-Type
  const contentType = request.headers.get("content-type");
  if (!isContentType(contentType, "application/json")) {
    throw new HttpError("Unsupported Media Type: application/json is required", 415);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new HttpError("Malformed JSON payload", 400);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError("Invalid JSON payload: JSON object expected", 400);
  }

  return parsed as T;
}

/**
 * Standardized JSON error response helper ensuring Cache-Control: no-store.
 */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
