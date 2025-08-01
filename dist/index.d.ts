import { type DeleteObjectCommandOutput, type PutObjectCommandInput, type DeleteBucketCommandInput } from "@aws-sdk/client-s3";
import type { ReadStream } from "node:fs";
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
    pool?: boolean;
};
type InitResult = {
    uploadStream(file: File, customParams?: Partial<PutObjectCommandInput>): Promise<undefined>;
    upload(file: File, customParams?: Partial<PutObjectCommandInput>): Promise<undefined>;
    delete(file: File, customParams?: Partial<DeleteBucketCommandInput>): Promise<DeleteObjectCommandOutput>;
};
declare const _default: {
    init({ params, credentials, endpoint, cloudflarePublicAccessUrl, pool, region, }: InitOptions): InitResult;
};
export default _default;
//# sourceMappingURL=index.d.ts.map