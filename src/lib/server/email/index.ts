import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

let _resend: Resend | null = null;

function getResend(): Resend {
	if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
	if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
	return _resend;
}

const FROM_ADDRESS = () => env.EMAIL_FROM_ADDRESS ?? 'orders@getorderlocal.com';
const FROM_NAME_DEFAULT = () => env.EMAIL_FROM_NAME_DEFAULT ?? 'Order Local';
const REPLY_TO_FALLBACK = () => env.EMAIL_REPLY_TO_FALLBACK ?? 'hello@getorderlocal.com';

export type EmailCategory =
	| 'order_confirmed'
	| 'order_ready'
	| 'order_cancelled'
	| 'order_refunded'
	| 'account_credit_refunded'
	| 'alternate_date_proposed'
	| 'alternate_declined'
	| 'custom_date_approved'
	| 'custom_date_recovered'
	| 'custom_date_payment_failed'
	| 'loyalty_reward'
	| 'special_order_quote_sent'
	| 'special_order_quote_expired'
	| 'special_order_accepted'
	| 'special_order_request_received_customer'
	| 'special_order_request_received_vendor'
	| 'special_order_accepted_vendor'
	| 'special_order_declined_by_customer_vendor'
	| 'subscription_confirmed'
	| 'subscription_tier_changed'
	| 'subscription_interval_changed'
	| 'subscription_addon_changed'
	| 'subscription_cancellation_scheduled'
	| 'subscription_cancellation_immediate'
	| 'subscription_cancellation_completed'
	| 'subscription_reactivated'
	| 'pause_confirmed'
	| 'pause_reminder'
	| 'pause_resumed'
	| 'pending_approval_reminder'
	| 'payment_failed'
	| 'invite'
	| 'auth';

export async function sendEmail({
	to,
	subject,
	html,
	fromName,
	replyTo,
	category
}: {
	to: string;
	subject: string;
	html: string;
	fromName?: string;
	replyTo?: string;
	category: EmailCategory;
}) {
	const resend = getResend();
	const address = FROM_ADDRESS();
	const name = fromName?.trim() || FROM_NAME_DEFAULT();
	const from = `"${name.replace(/"/g, '')}" <${address}>`;
	const replyToAddress = replyTo?.trim() || REPLY_TO_FALLBACK();

	const { error } = await resend.emails.send({
		from,
		to,
		subject,
		html,
		replyTo: replyToAddress,
		tags: [{ name: 'category', value: category }]
	});
	if (error) throw new Error(`Failed to send email: ${error.message}`);
}
