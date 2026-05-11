import { emailWrapper } from '../base';

export function pauseReminderEmail({
	recipientName,
	planName,
	pauseUntil,
	daysRemaining
}: {
	recipientName: string;
	planName: string;
	pauseUntil: string;
	daysRemaining: 7 | 3 | 1;
}) {
	const dayWord = daysRemaining === 1 ? 'day' : 'days';
	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      Your <strong>Order Local ${planName}</strong> subscription is paused and will automatically resume in <strong>${daysRemaining} ${dayWord}</strong> on <strong>${pauseUntil}</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Normal billing will pick back up on that date. To resume sooner, visit your billing dashboard.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: `Subscription resumes in ${daysRemaining} ${dayWord}`,
		previewText: `Your Order Local ${planName} subscription resumes in ${daysRemaining} ${dayWord} on ${pauseUntil}`,
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a'
	});
}
