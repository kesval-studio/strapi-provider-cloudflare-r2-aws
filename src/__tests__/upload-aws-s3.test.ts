import { beforeEach, describe, expect, test, vi } from "vitest";
import awsProvider, { File } from "../index";

const uploadMock = {
	done: vi.fn().mockImplementation(() => {
		return Promise.resolve({
			Location: "https://validurl.test/tmp/test.json",
			$metadata: {},
			Key: "tmp/test.json",
		});
	}),
};

vi.mock("@aws-sdk/lib-storage", () => {
	return {
		Upload: vi.fn().mockImplementation(() => {
			return uploadMock;
		}),
	};
});

describe("Cloudflare R2 AWS Provider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("upload", () => {
		test("Should add url to file object", async () => {
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

			await providerInstance.upload(file as File);

			expect(uploadMock.done).toBeCalled();
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

			expect(uploadMock.done).toBeCalled();
			expect(file.url).toBeDefined();
			expect(file.url).toEqual("https://cdn.test/tmp/test.json");
		});
	});
});
