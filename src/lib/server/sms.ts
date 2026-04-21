import twilio from 'twilio';
import { env } from '$env/dynamic/private';

export async function sendSms(to: string, body: string): Promise<void> {
	const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = env;
	if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return;
	const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
	await client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to });
}
