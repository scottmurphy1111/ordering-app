import { emailWrapper } from '../base';

export function subscriptionIntervalChangedEmail({
	recipientName,
	planName,
	fromInterval,
	toInterval,
	refundAmount
}: {
	recipientName: string;
	planName: string;
	fromInterval: 'monthly' | 'annual';
	toInterval: 'monthly' | 'annual';
	refundAmount?: string;
}) {
	const fromLabel = fromInterval === 'annual' ? 'annual' : 'monthly';
	const toLabel = toInterval === 'annual' ? 'annual' : 'monthly';

	const refundNote = refundAmount
		? `<p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
        A refund of <strong>${refundAmount}</strong> for the unused portion of your annual subscription will appear on your card in 5–10 business days.
      </p>`
		: '';

	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your Order Local <strong>${planName}</strong> subscription has been switched from ${fromLabel} to ${toLabel} billing.
    </p>
    ${refundNote}
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Billing interval changed',
		previewText: `Your Order Local ${planName} plan is now billed ${toLabel}`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
