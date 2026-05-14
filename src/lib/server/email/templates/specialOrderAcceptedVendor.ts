import { emailWrapper, formatCents } from '../base';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function specialOrderAcceptedVendorEmail({
	vendorName,
	primaryColor,
	customerName,
	customerEmail,
	customerPhone,
	orderNumber,
	priceCents,
	notes,
	scheduledFor,
	vendorTimezone = 'America/New_York',
	orderStatusUrl
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string | null;
	orderNumber: string;
	priceCents: number;
	notes: string | null;
	scheduledFor: Date | string | null;
	vendorTimezone?: string;
	orderStatusUrl: string;
}) {
	const scheduledFormatted = scheduledFor
		? new Intl.DateTimeFormat('en-US', {
				timeZone: vendorTimezone,
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			}).format(typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor)
		: null;

	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">New special order</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      ${escapeHtml(customerName)} accepted your quote and paid. The order is in your queue.
    </p>

    <div style="margin:0 0 24px;padding:20px;background:#f0fdf4;border-radius:8px;border-left:4px solid #10b981;">
      <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">Order ${escapeHtml(orderNumber)}</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${formatCents(priceCents)}</p>
      ${
				scheduledFormatted
					? `<p style="margin:12px 0 0;font-size:14px;color:#374151;">Pickup date: <strong>${escapeHtml(scheduledFormatted)}</strong></p>`
					: ''
			}
    </div>

    <div style="margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Customer</p>
      <p style="margin:0;font-size:14px;color:#374151;">
        ${escapeHtml(customerName)}<br/>
        <a href="mailto:${escapeHtml(customerEmail)}" style="color:#3b82f6;">${escapeHtml(customerEmail)}</a>
        ${customerPhone ? `<br/>${escapeHtml(customerPhone)}` : ''}
      </p>
    </div>

    ${
			notes
				? `<div style="margin:0 0 24px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Their request</p>
        <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;">${escapeHtml(notes)}</p>
      </div>`
				: ''
		}

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:8px;">
      <tr>
        <td style="text-align:center;">
          <a href="${orderStatusUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            View order
          </a>
        </td>
      </tr>
    </table>
  `;

	return emailWrapper({
		title: `New special order ${orderNumber} — ${customerName}`,
		previewText: `${customerName} accepted your quote — ${formatCents(priceCents)}`,
		content,
		displayName: vendorName,
		primaryColor
	});
}
