import { emailWrapper } from '../base';

export function paymentFailedEmail({
	tenantName,
	planName,
	amount,
	nextRetryDate
}: {
	tenantName: string;
	planName: string;
	amount: string;
	nextRetryDate?: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${tenantName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      We weren't able to process your payment of <strong>${amount}</strong> for your Order Local ${planName} subscription.
    </p>
    ${nextRetryDate ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">We'll automatically retry on <strong>${nextRetryDate}</strong>.</p>` : ''}
    <div style="margin:24px 0;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Action required</p>
      <p style="margin:8px 0 0;font-size:13px;color:#b91c1c;line-height:1.6;">
        Please update your payment method to avoid service interruption. Your access will continue until the retry period ends.
      </p>
    </div>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Need help? Contact us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Payment failed — action required',
		previewText: `Your Order Local payment of ${amount} could not be processed`,
		content,
		tenantName: 'Order Local',
		primaryColor: '#dc2626'
	});
}
