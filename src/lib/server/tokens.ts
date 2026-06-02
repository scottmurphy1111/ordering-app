/**
 * Generates a 32-character hex token (16 random bytes) for use as a
 * URL-safe lookup key — quote accept links, balance payment links, etc.
 */
export function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
