import { emailWrapper } from '../base';

export function subscriptionAddonChangedEmail({
	recipientName,
	addonName,
	direction
}: {
	recipientName: string;
	addonName: string;
	direction: 'activated' | 'deactivated';
}) {
	const isActivated = direction === 'activated';
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      The <strong>${addonName}</strong> add-on has been ${isActivated ? 'activated' : 'deactivated'} on your Order Local account.
      ${isActivated ? "You'll be billed a prorated amount for the current billing period." : 'Billing for this add-on has been stopped immediately.'}
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: isActivated ? 'Add-on activated' : 'Add-on deactivated',
		previewText: `${addonName} add-on ${isActivated ? 'activated' : 'deactivated'} on your Order Local account`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
