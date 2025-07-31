import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const removeLeadingSlash = (path)=>{
    return path.replace(/^\//, "");
};
const getPathKey = (file, pool = false)=>{
    const filePath = file.path ? `${file.path}/` : "";
    let path = filePath;
    if (!pool) {
        path = file.path && file.path !== "/" ? `${removeLeadingSlash(file.path)}/${filePath}` : filePath;
    }
    const Key = `${path}${file.hash}${file.ext}`;
    return {
        path,
        Key
    };
};
var index = {
    init ({ params, credentials, endpoint, cloudflarePublicAccessUrl, pool, region }) {
        const S3 = new S3Client({
            region: region || "auto",
            endpoint: endpoint,
            credentials: credentials
        });
        if (!cloudflarePublicAccessUrl) {
            process.emitWarning("\x1b[43mWARNING (strapi-provider-cloudflare-r2):\x1b[0m the provider config requires cloudflarePublicAccessUrl to upload files larger than 5MB. See more: https://github.com/trieb-work/strapi-provider-cloudflare-r2#provider-configuration");
        }
        const upload = async (file, customParams)=>{
            const { Key } = getPathKey(file, pool);
            const command = new Upload({
                client: S3,
                params: {
                    Bucket: params?.Bucket,
                    Key: Key,
                    // biome-ignore lint/suspicious/noExplicitAny: comes from official strapi s3 provider
                    Body: file.stream || Buffer.from(file.buffer, "binary"),
                    ContentType: file.mime,
                    ...customParams
                }
            });
            const uploaded = await command.done();
            const key = uploaded.Location === "auto" && uploaded.Key?.startsWith(`${params?.Bucket}/`) ? uploaded.Key.replace(`${params?.Bucket}/`, "") : uploaded.Key;
            // Set the bucket file URL.
            // If there is a custom endpoint for data access set, replace the upload endpoint with the read enpoint URL.
            // Otherwise, use location returned from S3 API if it's not "auto"
            if (cloudflarePublicAccessUrl) {
                file.url = `${cloudflarePublicAccessUrl.replace(/\/$/g, "")}/${key}`;
            } else if (uploaded.Location !== "auto") {
                file.url = uploaded.Location;
            } else {
                throw new Error("Cloudflare S3 API returned no file location and cloudflarePublicAccessUrl is not set. strapi-provider-cloudflare-r2-aws requires cloudflarePublicAccessUrl to upload files larger than 5MB. https://github.com/trieb-work/strapi-provider-cloudflare-r2#provider-configuration");
            }
        };
        return {
            uploadStream (file, customParams) {
                return upload(file, customParams);
            },
            upload (file, customParams) {
                return upload(file, customParams);
            },
            async delete (file, customParams = {}) {
                const { Key } = getPathKey(file, pool);
                const command = new DeleteObjectCommand({
                    Bucket: params?.Bucket,
                    Key: Key,
                    ...customParams
                });
                return await S3.send(command);
            }
        };
    }
};

export { index as default };
//# sourceMappingURL=index.mjs.map
