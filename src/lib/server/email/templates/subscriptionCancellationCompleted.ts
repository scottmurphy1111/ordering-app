import { emailWrapper } from '../base';

export function subscriptionCancellationCompletedEmail({
	recipientName,
	planName
}: {
	recipientName: string;
	planName: string;
}) {
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your <strong>Order Local ${planName}</strong> subscription has ended. Your account has been moved to the free Starter plan.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your storefront and order history are still accessible. Whenever you're ready to resubscribe, you can do so from your billing dashboard.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: 'Subscription ended',
		previewText: `Your Order Local ${planName} subscription has ended`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
