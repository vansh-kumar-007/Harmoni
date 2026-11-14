import { describe, it, expect } from "vitest";
import {
  isContentType,
  readRequestBodyText,
  parseJsonBody,
  parseOptionalJsonBody,
  HttpError,
  MAX_REQUEST_BODY_BYTES,
} from "@/lib/auth/http";

describe("HTTP Request Body & Content-Type Utility (src/lib/auth/http.ts)", () => {
  describe("isContentType", () => {
    it("accepts exact application/json", () => {
      expect(isContentType("application/json")).toBe(true);
      expect(isContentType("APPLICATION/JSON")).toBe(true);
    });

    it("accepts application/json with valid parameters (charset, etc.)", () => {
      expect(isContentType("application/json; charset=utf-8")).toBe(true);
      expect(isContentType("application/json;charset=UTF-8")).toBe(true);
      expect(isContentType("application/json; boundary=something; charset=utf-8")).toBe(true);
    });

    it("rejects non-json and near-miss media types", () => {
      expect(isContentType("application/jsonp")).toBe(false);
      expect(isContentType("text/plain")).toBe(false);
      expect(isContentType("text/html")).toBe(false);
      expect(isContentType("application/xml")).toBe(false);
      expect(isContentType("application/x-www-form-urlencoded")).toBe(false);
      expect(isContentType("multipart/form-data")).toBe(false);
      expect(isContentType("")).toBe(false);
      expect(isContentType(null)).toBe(false);
    });
  });

  describe("readRequestBodyText", () => {
    it("returns null for empty request body", async () => {
      const req = new Request("http://localhost:3000/api/test", { method: "POST" });
      const text = await readRequestBodyText(req);
      expect(text).toBeNull();
    });

    it("reads full text for small valid payload", async () => {
      const payload = JSON.stringify({ hello: "world" });
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: payload,
      });
      const text = await readRequestBodyText(req);
      expect(text).toBe(payload);
    });

    it("rejects early via Content-Length header when oversized", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Length": "70000" },
        body: "small body but header lies",
      });

      await expect(readRequestBodyText(req)).rejects.toThrow(HttpError);
      try {
        await readRequestBodyText(req);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).status).toBe(413);
        expect((err as HttpError).message).toContain("maximum size is 64 KiB");
      }
    });

    it("rejects oversized stream even when Content-Length header is completely absent", async () => {
      let streamCancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(35 * 1024));
        },
        cancel() {
          streamCancelled = true;
        },
      });

      // Construct request with stream without Content-Length
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit & { duplex: string });

      // Verify Content-Length is absent
      expect(req.headers.get("content-length")).toBeNull();

      // Enforce stream reading fails with 413
      try {
        await readRequestBodyText(req, MAX_REQUEST_BODY_BYTES);
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).status).toBe(413);
        expect((err as HttpError).message).toContain("maximum size is 64 KiB");
      }

      // Verify stream was cancelled to prevent further reading
      expect(streamCancelled).toBe(true);
    });
  });

  describe("parseJsonBody", () => {
    it("rejects non-json content types with 415", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      });

      await expect(parseJsonBody(req)).rejects.toThrow(HttpError);
      try {
        await parseJsonBody(req);
      } catch (err: unknown) {
        expect((err as HttpError).status).toBe(415);
      }
    });

    it("rejects application/jsonp with 415", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/jsonp" },
        body: "{}",
      });

      try {
        await parseJsonBody(req);
        expect.unreachable();
      } catch (err: unknown) {
        expect((err as HttpError).status).toBe(415);
      }
    });

    it("rejects empty body with 400", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      try {
        await parseJsonBody(req);
        expect.unreachable();
      } catch (err: unknown) {
        expect((err as HttpError).status).toBe(400);
        expect((err as HttpError).message).toContain("Malformed JSON payload");
      }
    });

    it("rejects malformed JSON syntax with 400", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ broken json",
      });

      try {
        await parseJsonBody(req);
        expect.unreachable();
      } catch (err: unknown) {
        expect((err as HttpError).status).toBe(400);
        expect((err as HttpError).message).toBe("Malformed JSON payload");
      }
    });

    it("rejects JSON primitives and arrays with 400 (requires object)", async () => {
      const makeReq = (val: string) =>
        new Request("http://localhost:3000/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: val,
        });

      await expect(parseJsonBody(makeReq('"string"'))).rejects.toThrow(/JSON object expected/);
      await expect(parseJsonBody(makeReq("12345"))).rejects.toThrow(/JSON object expected/);
      await expect(parseJsonBody(makeReq("true"))).rejects.toThrow(/JSON object expected/);
      await expect(parseJsonBody(makeReq("[1, 2, 3]"))).rejects.toThrow(/JSON object expected/);
    });

    it("successfully parses valid JSON object with charset=utf-8", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ username: "alice", valid: true }),
      });

      const data = await parseJsonBody<{ username: string; valid: boolean }>(req);
      expect(data.username).toBe("alice");
      expect(data.valid).toBe(true);
    });
  });

  describe("parseOptionalJsonBody", () => {
    it("returns default fallback when request body is genuinely empty", async () => {
      const req = new Request("http://localhost:3000/api/test", { method: "POST" });
      const data = await parseOptionalJsonBody(req, { defaultKey: "val" });
      expect(data).toEqual({ defaultKey: "val" });
    });

    it("returns default fallback when Content-Length is explicitly '0'", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Length": "0" },
      });
      const data = await parseOptionalJsonBody(req, { fallback: true });
      expect(data).toEqual({ fallback: true });
    });

    it("rejects non-empty body with unsupported Content-Type (e.g. text/plain) with 415", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "some text",
      });

      await expect(parseOptionalJsonBody(req)).rejects.toThrow(HttpError);
      try {
        await parseOptionalJsonBody(req);
      } catch (err: unknown) {
        expect((err as HttpError).status).toBe(415);
      }
    });

    it("successfully parses valid JSON when provided", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ expiresInDays: 14 }),
      });

      const data = await parseOptionalJsonBody<{ expiresInDays: number }>(req);
      expect(data.expiresInDays).toBe(14);
    });
  });
});
