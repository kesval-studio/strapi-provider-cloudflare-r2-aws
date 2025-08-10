import { beforeEach, describe, expect, test, vi } from "vitest";
import awsProvider, { type File } from "../index";

// Mock S3 client and commands
const s3SendMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => {
	s3SendMock.mockResolvedValue({});
	return {
		S3Client: vi.fn().mockImplementation(() => ({
			send: s3SendMock,
		})),
		PutObjectCommand: vi
			.fn()
			.mockImplementation((params) => ({ input: params })),
		DeleteObjectCommand: vi
			.fn()
			.mockImplementation((params) => ({ input: params })),
	};
});

describe("Cloudflare R2 AWS Provider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("upload", () => {
		test("Should add url to file object when public URL is provided", async () => {
			const providerInstance = awsProvider.init({
				cloudflarePublicAccessUrl: "https://validurl.test",
				params: {
					Bucket: "test",
				},
			});

			const file: Partial<File> = {
				name: "test",
				size: 100,
				url: "",
				path: "tmp",
				hash: "test",
				ext: ".json",
				mime: "application/json",
				buffer: Buffer.from(""),
			};

			await providerInstance.upload(file as File);

			expect(s3SendMock).toBeCalled();
			expect(file.url).toBeDefined();
			expect(file.url).toEqual("https://validurl.test/tmp/test.json");
		});

		test("Public url should be prepended to the url of the file object", async () => {
			const providerInstance = awsProvider.init({
				cloudflarePublicAccessUrl: "https://cdn.test",
				region: "test",
				params: {
					Bucket: "test",
				},
			});

			const file: Partial<File> = {
				name: "test",
				size: 100,
				url: "",
				path: "tmp/test",
				hash: "test",
				ext: ".json",
				mime: "application/json",
				buffer: Buffer.from(""),
			};

			await providerInstance.upload(file as File);

			expect(s3SendMock).toBeCalled();
			expect(file.url).toBeDefined();
			expect(file.url).toEqual("https://cdn.test/tmp/test/test.json");
		});

		test("Should work correctly for all file paths", async () => {
			const providerInstance = awsProvider.init({
				cloudflarePublicAccessUrl: "https://cdn.test",
				params: {
					Bucket: "test",
				},
			});

			const file: Partial<File> = {
				name: "test",
				size: 100,
				url: "",
				path: "uploads",
				hash: "test",
				ext: ".jpg",
				mime: "image/jpeg",
				buffer: Buffer.from(""),
			};

			await providerInstance.upload(file as File);

			expect(s3SendMock).toBeCalled();
			expect(file.url).toBeDefined();
			// Should produce correct path structure
			expect(file.url).toEqual("https://cdn.test/uploads/test.jpg");
		});

		test("Should throw if public URL is not configured", async () => {
			const providerInstance = awsProvider.init({
				params: {
					Bucket: "test",
				},
			});

			const file: Partial<File> = {
				name: "test",
				size: 100,
				url: "",
				path: "tmp",
				hash: "test",
				ext: ".json",
				mime: "application/json",
				buffer: Buffer.from(""),
			};

			await expect(providerInstance.upload(file as File)).rejects.toThrow();
		});
	});
});
