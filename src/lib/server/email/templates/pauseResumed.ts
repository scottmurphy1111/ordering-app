import { emailWrapper } from '../base';

export function pauseResumedEmail({
	tenantName,
	planName
}: {
	tenantName: string;
	planName: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${tenantName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your <strong>Order Local ${planName}</strong> subscription has resumed. Billing is active again and your next invoice will fall on your regular billing date.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Welcome back — your storefront is fully active.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Subscription resumed',
		previewText: `Your Order Local ${planName} subscription is active again`,
		content,
		tenantName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
