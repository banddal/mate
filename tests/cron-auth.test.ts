import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// server-only는 테스트(node) 환경에서 import되면 에러를 던지므로 무력화한다.
vi.mock("server-only", () => ({}));

import { isAuthorizedCronRequest } from "@/lib/cron/auth";

function makeRequest(authHeader?: string) {
  return new Request("https://example.com/api/internal/cron/x", {
    headers: authHeader ? { authorization: authHeader } : {}
  });
}

describe("isAuthorizedCronRequest", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123";
  });

  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it("올바른 Bearer secret이면 통과한다", () => {
    expect(isAuthorizedCronRequest(makeRequest("Bearer test-secret-123"))).toBe(true);
  });

  it("secret이 틀리면 거부한다", () => {
    expect(isAuthorizedCronRequest(makeRequest("Bearer wrong"))).toBe(false);
  });

  it("Authorization 헤더가 없으면 거부한다", () => {
    expect(isAuthorizedCronRequest(makeRequest())).toBe(false);
  });

  it("Bearer 접두사가 없으면 거부한다", () => {
    expect(isAuthorizedCronRequest(makeRequest("test-secret-123"))).toBe(false);
  });

  it("CRON_SECRET이 설정되지 않은 환경에서는 무조건 거부한다 (내부 엔드포인트는 공개 API가 아님)", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(makeRequest("Bearer test-secret-123"))).toBe(false);
    expect(isAuthorizedCronRequest(makeRequest())).toBe(false);
  });
});
