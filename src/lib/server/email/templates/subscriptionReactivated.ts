import { emailWrapper } from '../base';

export function subscriptionReactivatedEmail({
	recipientName,
	planName
}: {
	recipientName: string;
	planName: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Great news — your <strong>Order Local ${planName}</strong> subscription is staying active. The scheduled cancellation has been called off and your plan will continue to renew normally.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      No action needed. You'll keep all your ${planName} features without interruption.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Your subscription is staying active',
		previewText: `Your ${planName} subscription will continue to renew`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
