import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let _resend: Resend | null = null;

function getResend(): Resend {
	if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
	if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
	return _resend;
}

export async function sendEmail({
	to,
	subject,
	html
}: {
	to: string;
	subject: string;
	html: string;
}) {
	const resend = getResend();
	const from = env.EMAIL_FROM ?? 'orders@getorderlocal.com';

	const { error } = await resend.emails.send({ from, to, subject, html });
	if (error) throw new Error(`Failed to send email: ${error.message}`);
}
