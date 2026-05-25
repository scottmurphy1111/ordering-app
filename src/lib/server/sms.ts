import twilio from 'twilio';
import { env } from '$env/dynamic/private';
import { effectiveHasAddon, type AddonItem } from '$lib/billing';

function toE164(raw: string): string | null {
	const digits = raw.replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	if (digits.length > 7) return `+${digits}`; // international — best effort
	return null;
}

export type SmsVendorContext = {
	subscriptionTier: string | undefined;
	addons: AddonItem[] | null | undefined;
};

export async function sendSms(
	to: string,
	body: string,
	vendorCtx: SmsVendorContext
): Promise<void> {
	// Gate first, before peeking at Twilio config — a vendor without the add-on
	// burns no Twilio cost regardless of env state. Silent skip is correct: SMS
	// not being sent is the expected, billed behavior, not an error worth logging.
	const hasAccess = effectiveHasAddon(
		vendorCtx.subscriptionTier ?? 'starter',
		vendorCtx.addons,
		'sms_notifications'
	);
	if (!hasAccess) return;

	const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = env;
	if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
		console.warn('[sms] Twilio env vars not set — skipping SMS');
		return;
	}

	const e164 = toE164(to);
	if (!e164) {
		console.warn(`[sms] Could not normalize phone number: "${to}" — skipping`);
		return;
	}

	try {
		const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
		await client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to: e164 });
		console.log(`[sms] Sent to ${e164}`);
	} catch (err) {
		console.error(`[sms] Failed to send to ${e164}:`, err);
	}
}
