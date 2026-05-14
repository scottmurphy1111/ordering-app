import { emailWrapper, formatCents } from '../base';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function fmtDate(d: Date | string, tz: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	}).format(typeof d === 'string' ? new Date(d) : d);
}

export function specialOrderAcceptedEmail({
	vendorName,
	primaryColor,
	orderNumber,
	customerName,
	priceCents,
	notes,
	scheduledFor,
	vendorTimezone = 'America/New_York',
	orderStatusUrl
}: {
	vendorName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	priceCents: number;
	notes?: string | null;
	scheduledFor?: Date | string | null;
	vendorTimezone?: string;
	orderStatusUrl: string;
}) {
	const pickupBlock = scheduledFor
		? `
    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Requested pickup date</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${fmtDate(scheduledFor, vendorTimezone)}</p>
    </div>`
		: '';

	const notesBlock = notes
		? `
    <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #e5e7eb;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your request</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${escapeHtml(notes)}</p>
    </div>`
		: '';

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Payment confirmed!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Thanks, ${escapeHtml(customerName)}. Your payment for your custom order from ${escapeHtml(vendorName)} has been received.</p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Order number</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:monospace;">${escapeHtml(orderNumber)}</p>
    </div>

    <div style="margin-bottom:24px;padding:20px;background:#f0fdf4;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Amount paid</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#111827;">${formatCents(priceCents)}</p>
    </div>

    ${notesBlock}
    ${pickupBlock}

    <p style="margin:24px 0 20px;font-size:14px;color:#6b7280;">${escapeHtml(vendorName)} will be in touch to confirm the final details.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="text-align:center;">
          <a href="${orderStatusUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            Track your order
          </a>
        </td>
      </tr>
    </table>
  `;

	return emailWrapper({
		title: `Order ${orderNumber} confirmed — ${vendorName}`,
		previewText: `Payment confirmed for your custom order from ${vendorName} — ${formatCents(priceCents)}`,
		content,
		displayName: vendorName,
		primaryColor
	});
}
