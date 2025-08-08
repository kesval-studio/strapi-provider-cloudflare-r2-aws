import {
	S3Client,
	DeleteObjectCommand,
	type DeleteObjectCommandOutput,
	type PutObjectCommandInput,
	type DeleteBucketCommandInput,
} from "@aws-sdk/client-s3";
import type { ReadStream } from "node:fs";
import { Upload } from "@aws-sdk/lib-storage";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

export interface File {
	name: string;
	alternativeText?: string;
	caption?: string;
	width?: number;
	height?: number;
	formats?: Record<string, unknown>;
	hash: string;
	ext?: string;
	mime: string;
	size: number;
	sizeInBytes: number;
	url: string;
	previewUrl?: string;
	path?: string;
	provider?: string;
	provider_metadata?: Record<string, unknown>;
	stream?: ReadStream;
	buffer?: Buffer;
}

export type InitOptions = {
	credentials?: AwsCredentialIdentity;

	endpoint?: string;
	params?: {
		Bucket?: string;
	};

	region?: string;

	cloudflarePublicAccessUrl?: string;
};

type InitResult = {
	uploadStream(
		file: File,
		customParams?: Partial<PutObjectCommandInput>,
	): Promise<undefined>;
	upload(
		file: File,
		customParams?: Partial<PutObjectCommandInput>,
	): Promise<undefined>;
	delete(
		file: File,
		customParams?: Partial<DeleteBucketCommandInput>,
	): Promise<DeleteObjectCommandOutput>;
};

const getPathKey = (file: File) => {
	const filePath = file.path ? `${file.path}/` : "";
	const path = filePath;

	const Key = `${path}${file.hash}${file.ext}`;
	return { path, Key };
};

export default {
	init({
		params,
		credentials,
		endpoint,
		cloudflarePublicAccessUrl,
		region,
	}: InitOptions): InitResult {
		const S3 = new S3Client({
			region: region || "auto",
			endpoint: endpoint,
			credentials: credentials,
		});

		if (!cloudflarePublicAccessUrl) {
			process.emitWarning(
				"\x1b[43mWARNING (strapi-provider-cloudflare-r2):\x1b[0m the provider config requires cloudflarePublicAccessUrl to upload files larger than 5MB. See more: https://github.com/trieb-work/strapi-provider-cloudflare-r2#provider-configuration",
			);
		}

		const upload: InitResult["upload"] = async (file, customParams) => {
			const { Key } = getPathKey(file);

			const command = new Upload({
				client: S3,
				params: {
					Bucket: params?.Bucket,
					Key: Key,
					// biome-ignore lint/suspicious/noExplicitAny: comes from official strapi s3 provider
					Body: file.stream || Buffer.from(file.buffer as any, "binary"),
					ContentType: file.mime,
					...customParams,
				},
			});

			const uploaded = await command.done();

			// Always use the originally computed Key to avoid accidental bucket duplication
			const key = uploaded.Key?.startsWith(`${params?.Bucket}/`)
				? uploaded.Key.replace(`${params?.Bucket}/`, "")
				: uploaded.Key;

			// Set the bucket file URL.
			// If there is a custom endpoint for data access set, replace the upload endpoint with the read enpoint URL.
			// Otherwise, use location returned from S3 API if it's not "auto"
			if (cloudflarePublicAccessUrl) {
				file.url = `${cloudflarePublicAccessUrl.replace(/\/$/g, "")}/${key}`;
			} else if (uploaded.Location !== "auto") {
				file.url = uploaded.Location as string;
			} else {
				throw new Error(
					"Cloudflare S3 API returned no file location and cloudflarePublicAccessUrl is not set. strapi-provider-cloudflare-r2-aws requires cloudflarePublicAccessUrl to upload files larger than 5MB. https://github.com/trieb-work/strapi-provider-cloudflare-r2#provider-configuration",
				);
			}
		};

		return {
			uploadStream(file, customParams) {
				return upload(file, customParams);
			},
			upload(file, customParams) {
				return upload(file, customParams);
			},
			async delete(file, customParams = {}) {
				const { Key } = getPathKey(file);

				const command = new DeleteObjectCommand({
					Bucket: params?.Bucket,
					Key: Key,
					...customParams,
				});

				return await S3.send(command);
			},
		};
	},
};
