import { emailWrapper } from '../base';

export function subscriptionConfirmedEmail({
	tenantName,
	planName,
	amount,
	nextBillingDate
}: {
	tenantName: string;
	planName: string;
	amount: string;
	nextBillingDate?: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${tenantName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your subscription to <strong>Order Local ${planName}</strong> is now active. Here's a summary:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Plan</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:right;">Order Local ${planName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e5e7eb;">Amount</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">${amount}/month</td>
      </tr>
      ${nextBillingDate ? `<tr>
        <td style="padding:12px 16px;background:#f9fafb;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e5e7eb;">Next billing date</td>
        <td style="padding:12px 16px;font-size:14px;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">${nextBillingDate}</td>
      </tr>` : ''}
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">
      You can manage your subscription, update your payment method, or view invoices from your billing dashboard.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: `You're on Order Local ${planName}`,
		previewText: `Your Order Local ${planName} subscription is active — ${amount}/month`,
		content,
		tenantName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
