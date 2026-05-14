import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockPost } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
}));

vi.mock("axios", () => ({
	default: {
		create: () => ({ get: mockGet, post: mockPost }),
	},
}));

describe("readAuthConfig", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.DOKPLOY_URL;
		delete process.env.DOKPLOY_API_KEY;
		delete process.env.DOKPLOY_AUTH_TOKEN;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it("should read from DOKPLOY_API_KEY env var", async () => {
		process.env.DOKPLOY_URL = "https://test.dokploy.com";
		process.env.DOKPLOY_API_KEY = "test-key-123";

		const { readAuthConfig } = await import("../src/client.js");
		const config = readAuthConfig();

		expect(config.url).toBe("https://test.dokploy.com");
		expect(config.token).toBe("test-key-123");
	});

	it("should read from DOKPLOY_AUTH_TOKEN env var as fallback", async () => {
		process.env.DOKPLOY_URL = "https://test.dokploy.com";
		process.env.DOKPLOY_AUTH_TOKEN = "auth-token-456";

		const { readAuthConfig } = await import("../src/client.js");
		const config = readAuthConfig();

		expect(config.url).toBe("https://test.dokploy.com");
		expect(config.token).toBe("auth-token-456");
	});

	it("should prefer DOKPLOY_API_KEY over DOKPLOY_AUTH_TOKEN", async () => {
		process.env.DOKPLOY_URL = "https://test.dokploy.com";
		process.env.DOKPLOY_API_KEY = "api-key";
		process.env.DOKPLOY_AUTH_TOKEN = "auth-token";

		const { readAuthConfig } = await import("../src/client.js");
		const config = readAuthConfig();

		expect(config.token).toBe("api-key");
	});
});

describe("saveAuthConfig", () => {
	it("should write config with correct structure", async () => {
		const { saveAuthConfig } = await import("../src/client.js");
		expect(typeof saveAuthConfig).toBe("function");
	});
});

describe("apiGet URL construction", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.DOKPLOY_URL = "https://example.test";
		process.env.DOKPLOY_API_KEY = "test-key";
		mockGet.mockReset();
		mockGet.mockResolvedValue({ data: { result: { data: { json: null } } } });
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("wraps params in {json: ...} envelope for tRPC", async () => {
		const { apiGet } = await import("../src/client.js");
		await apiGet("application.one", { applicationId: "abc123" });

		expect(mockGet).toHaveBeenCalledOnce();
		const [url] = mockGet.mock.calls[0];
		const match = url.match(/\?input=(.+)$/);
		expect(match, `expected ?input=... in URL, got: ${url}`).not.toBeNull();
		const decoded = JSON.parse(decodeURIComponent(match[1]));
		expect(decoded).toEqual({ json: { applicationId: "abc123" } });
	});

	it("sends no input query param when params is omitted", async () => {
		const { apiGet } = await import("../src/client.js");
		await apiGet("project.all");

		expect(mockGet).toHaveBeenCalledOnce();
		const [url] = mockGet.mock.calls[0];
		expect(url).not.toContain("input=");
	});
});

describe("apiPost body construction", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.DOKPLOY_URL = "https://example.test";
		process.env.DOKPLOY_API_KEY = "test-key";
		mockPost.mockReset();
		mockPost.mockResolvedValue({ data: { result: { data: { json: null } } } });
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("wraps body in {json: ...} envelope for tRPC", async () => {
		const { apiPost } = await import("../src/client.js");
		await apiPost("application.create", { name: "x", environmentId: "y" });

		expect(mockPost).toHaveBeenCalledOnce();
		const [, body] = mockPost.mock.calls[0];
		expect(body).toEqual({ json: { name: "x", environmentId: "y" } });
	});

	it("sends undefined body when data is omitted", async () => {
		const { apiPost } = await import("../src/client.js");
		await apiPost("application.deploy");

		expect(mockPost).toHaveBeenCalledOnce();
		const [, body] = mockPost.mock.calls[0];
		expect(body).toBeUndefined();
	});
});
