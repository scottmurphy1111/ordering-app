import { emailWrapper } from '../base';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function specialOrderRequestReceivedCustomerEmail({
	vendorName,
	primaryColor,
	customerName,
	description,
	targetDate
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	description: string;
	targetDate: string | null;
}): string {
	const targetDateFormatted = targetDate
		? new Intl.DateTimeFormat('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			}).format(new Date(targetDate + 'T12:00:00Z'))
		: null;

	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
      Got it — we'll be in touch
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Hi ${escapeHtml(customerName)},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      Thanks for your custom-order request. ${escapeHtml(vendorName)} will review it and follow up with a quote — usually within a day or two.
    </p>

    <div style="margin:24px 0;padding:16px;background:#f9fafb;border-radius:8px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your request</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;">${escapeHtml(description)}</p>
      ${
				targetDateFormatted
					? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Desired date: <strong>${escapeHtml(targetDateFormatted)}</strong></p>`
					: ''
			}
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      If you have questions in the meantime, you can contact ${escapeHtml(vendorName)} directly.
    </p>
  `;

	return emailWrapper({
		title: `We got your request — ${vendorName}`,
		previewText: `Your custom-order request has been received. ${vendorName} will follow up.`,
		displayName: vendorName,
		primaryColor,
		content
	});
}
