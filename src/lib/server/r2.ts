import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

function getClient() {
	return new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

export async function uploadToR2(
	file: File,
	prefix: string
): Promise<string> {
	const timestamp = Date.now();
	const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
	const key = `${prefix}-${timestamp}.${extension}`;

	await getClient().send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key,
			Body: Buffer.from(await file.arrayBuffer()),
			ContentType: file.type
		})
	);

	return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(publicUrl: string): Promise<void> {
	const key = publicUrl.replace(`${env.R2_PUBLIC_URL}/`, '');
	await getClient().send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key
		})
	);
}
