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
 * RFC 9110 compliant token regex: 1 or more tchars.
 * tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA
 */
const TOKEN_REGEX = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;

/**
 * Validates that the Content-Type header matches the expected media type,
 * validating both the media-type name and the parameter syntax per RFC 9110.
 *
 * Requirements:
 * - 'application/json' is accepted.
 * - 'application/json; charset=utf-8' is accepted.
 * - Parameter names and tokens are handled case-insensitively as appropriate.
 * - Malformed parameters, missing parameter values, invalid quoted strings,
 *   and malformed media types are rejected.
 * - 'application/jsonp' is rejected.
 *
 * @param contentTypeHeader Incoming Content-Type header value
 * @param expectedMediaType Expected media type (defaults to 'application/json')
 * @returns true if valid match, false otherwise
 */
export function isContentType(
  contentTypeHeader: string | null | undefined,
  expectedMediaType = "application/json"
): boolean {
  if (!contentTypeHeader || typeof contentTypeHeader !== "string") {
    return false;
  }
  const trimmed = contentTypeHeader.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const semiIndex = trimmed.indexOf(";");
  const primary = (semiIndex === -1 ? trimmed : trimmed.slice(0, semiIndex)).trim();

  const slashIndex = primary.indexOf("/");
  if (slashIndex === -1) {
    return false;
  }
  const type = primary.slice(0, slashIndex);
  const rest = primary.slice(slashIndex + 1);
  if (rest.indexOf("/") !== -1) {
    return false;
  }
  const subtype = rest;

  if (!TOKEN_REGEX.test(type) || !TOKEN_REGEX.test(subtype)) {
    return false;
  }

  if (primary.toLowerCase() !== expectedMediaType.toLowerCase()) {
    return false;
  }

  if (semiIndex === -1) {
    return true;
  }

  let pos = semiIndex;
  while (pos < trimmed.length) {
    if (trimmed[pos] !== ";") {
      return false;
    }
    pos++;

    // Skip optional whitespace (SP / HTAB)
    while (pos < trimmed.length && (trimmed[pos] === " " || trimmed[pos] === "\t")) {
      pos++;
    }

    // Trailing semicolon with no parameter or empty parameter (e.g. "application/json;")
    if (pos >= trimmed.length || trimmed[pos] === ";") {
      return false;
    }

    // Scan parameter name
    const nameStart = pos;
    while (
      pos < trimmed.length &&
      trimmed[pos] !== "=" &&
      trimmed[pos] !== ";" &&
      trimmed[pos] !== " " &&
      trimmed[pos] !== "\t"
    ) {
      pos++;
    }
    const paramName = trimmed.slice(nameStart, pos);
    if (!TOKEN_REGEX.test(paramName)) {
      return false;
    }

    // Skip optional whitespace before '='
    while (pos < trimmed.length && (trimmed[pos] === " " || trimmed[pos] === "\t")) {
      pos++;
    }

    if (pos >= trimmed.length || trimmed[pos] !== "=") {
      return false;
    }
    pos++; // advance past '='

    // Skip optional whitespace after '='
    while (pos < trimmed.length && (trimmed[pos] === " " || trimmed[pos] === "\t")) {
      pos++;
    }

    if (pos >= trimmed.length) {
      // Missing parameter value, e.g. "application/json; charset="
      return false;
    }

    if (trimmed[pos] === '"') {
      // Quoted string per RFC 9110
      pos++; // skip opening quote
      let closed = false;
      while (pos < trimmed.length) {
        const ch = trimmed[pos];
        if (ch === "\\") {
          pos++;
          if (pos >= trimmed.length) {
            return false;
          }
          const escaped = trimmed.charCodeAt(pos);
          // quoted-pair: HTAB (9) / SP (32) / VCHAR (%x21-7E) / obs-text (%x80-FF)
          if (escaped !== 9 && (escaped < 32 || (escaped > 126 && escaped < 128))) {
            return false;
          }
          pos++;
        } else if (ch === '"') {
          closed = true;
          pos++; // skip closing quote
          break;
        } else {
          const code = trimmed.charCodeAt(pos);
          // qdtext: HTAB (9) / SP (32) / %x21 (33) / %x23-5B (35-91) / %x5D-7E (93-126) / obs-text (128-255)
          if (code === 9 || (code >= 32 && code <= 126) || code >= 128) {
            pos++;
          } else {
            return false;
          }
        }
      }
      if (!closed) {
        return false;
      }

      // Skip whitespace after quoted string
      while (pos < trimmed.length && (trimmed[pos] === " " || trimmed[pos] === "\t")) {
        pos++;
      }

      if (pos < trimmed.length && trimmed[pos] !== ";") {
        return false;
      }
    } else {
      // Token value
      const valStart = pos;
      while (
        pos < trimmed.length &&
        trimmed[pos] !== ";" &&
        trimmed[pos] !== " " &&
        trimmed[pos] !== "\t"
      ) {
        pos++;
      }
      const paramVal = trimmed.slice(valStart, pos);
      if (!TOKEN_REGEX.test(paramVal)) {
        return false;
      }

      while (pos < trimmed.length && (trimmed[pos] === " " || trimmed[pos] === "\t")) {
        pos++;
      }

      if (pos < trimmed.length && trimmed[pos] !== ";") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Safely reads the raw request body stream up to maxBytes.
 * Enforces the size limit on actual bytes read from the stream,
 * even when Content-Length is missing or falsified.
 *
 * Cancels the reader immediately if the limit is exceeded to prevent resource exhaustion.
 * Returns null strictly when zero actual bytes were received; whitespace-only content is preserved.
 *
 * @param request Incoming Web Fetch API Request
 * @param maxBytes Maximum allowable bytes (default 64 KiB)
 * @returns The body as a UTF-8 string, or null if the body is empty (zero bytes)
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

  // Return null strictly when zero actual bytes were received
  if (chunks.length === 0 || totalBytes === 0) {
    return null;
  }

  const decoder = new TextDecoder("utf-8");
  let text = "";
  for (const chunk of chunks) {
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();

  // Preserve whitespace-only content as non-empty string
  return text;
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
  if (rawText === null) {
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
 * If the body is genuinely empty (zero actual bytes received), returns fallback.
 * If a body is provided, strictly requires 'application/json' and valid JSON syntax.
 *
 * Always reads the stream rather than trusting 'Content-Length: 0'.
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
  // Always determine whether the request body is genuinely empty by reading the stream
  const rawText = await readRequestBodyText(request, maxBytes);
  if (rawText === null) {
    // Body is genuinely empty (zero actual bytes received)
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
