import { emailWrapper } from '../base';

export function subscriptionTierChangedEmail({
	recipientName,
	fromPlanName,
	toPlanName,
	direction
}: {
	recipientName: string;
	fromPlanName: string;
	toPlanName: string;
	direction: 'upgrade' | 'downgrade';
}) {
	const isUpgrade = direction === 'upgrade';
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your Order Local plan has been ${isUpgrade ? 'upgraded' : 'changed'} from <strong>${fromPlanName}</strong> to <strong>${toPlanName}</strong>.
      ${isUpgrade ? 'Your new features are active immediately.' : 'Your plan takes effect immediately.'}
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: isUpgrade ? 'Plan upgraded' : 'Plan changed',
		previewText: `Your Order Local plan changed from ${fromPlanName} to ${toPlanName}`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
