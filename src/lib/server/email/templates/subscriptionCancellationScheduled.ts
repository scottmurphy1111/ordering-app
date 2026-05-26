import { emailWrapper } from '../base';

export function subscriptionCancellationScheduledEmail({
	recipientName,
	planName,
	accessUntil
}: {
	recipientName: string;
	planName: string;
	accessUntil: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your <strong>Order Local ${planName}</strong> subscription has been scheduled to cancel. You'll keep access to all paid features through <strong>${accessUntil}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Changed your mind? You can reactivate anytime from your billing dashboard before that date.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Subscription cancellation scheduled',
		previewText: `Your Order Local ${planName} subscription will end on ${accessUntil}`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
