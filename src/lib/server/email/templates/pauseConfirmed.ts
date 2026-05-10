import { emailWrapper } from '../base';

export function pauseConfirmedEmail({
	senderName,
	planName,
	pauseUntil
}: {
	senderName: string;
	planName: string;
	pauseUntil: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${senderName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your <strong>Order Local ${planName}</strong> subscription has been paused. Billing will resume automatically on <strong>${pauseUntil}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      During the pause, your storefront stays active and your data is safe. You can resume early at any time from your billing dashboard.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Subscription paused',
		previewText: `Your Order Local ${planName} subscription is paused until ${pauseUntil}`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
