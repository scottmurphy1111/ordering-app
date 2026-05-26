import { emailWrapper } from '../base';

export function accountCreditRefundedEmail({
	recipientName,
	refundAmount
}: {
	recipientName: string;
	refundAmount: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your Order Local account credit of <strong>${refundAmount}</strong> has been refunded to your card on file. It will appear in 5–10 business days.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Account credit refunded',
		previewText: `Your Order Local account credit of ${refundAmount} has been refunded to your card`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
