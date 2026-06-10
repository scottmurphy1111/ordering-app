import { emailWrapper, orderItemsTable, formatCents } from '../base';

function fmtDate(date: Date | string, tz: string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(d);
}

export function customDateOrderRecoveredEmail({
	vendorName,
	primaryColor,
	vendorSubscriptionTier,
	orderNumber,
	customerName,
	items,
	subtotal,
	tax,
	tip,
	total,
	scheduledFor,
	vendorTimezone = 'America/New_York',
	notes,
	orderStatusUrl
}: {
	vendorName: string;
	primaryColor?: string;
	vendorSubscriptionTier?: string;
	orderNumber: string;
	customerName: string;
	items: Array<{
		name: string;
		quantity: number;
		basePrice: number;
		selectedModifiers?: Array<{ name: string; priceAdjustment: number; quantity?: number }>;
	}>;
	subtotal: number;
	tax: number;
	tip: number;
	total: number;
	scheduledFor: Date | string;
	vendorTimezone?: string;
	notes?: string | null;
	orderStatusUrl: string;
}) {
	const dateBlock = `
    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Requested pickup date</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${fmtDate(scheduledFor, vendorTimezone)}</p>
    </div>`;

	const notesBlock = notes
		? `<div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Order notes</p>
      <p style="margin:0;font-size:14px;color:#374151;">${notes}</p>
    </div>`
		: '';

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Payment confirmed!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${customerName}, we've successfully processed payment for your order ${orderNumber}. Your card has been charged and we'll have your order ready on the date you requested.</p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Order number</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:monospace;">${orderNumber}</p>
    </div>

    ${orderItemsTable(items)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;">Subtotal</td>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${formatCents(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;">Tax</td>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${formatCents(tax)}</td>
      </tr>
      ${
				tip > 0
					? `<tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;">Tip</td>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${formatCents(tip)}</td>
      </tr>`
					: ''
			}
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #111827;">Total charged</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #111827;">${formatCents(total)}</td>
      </tr>
    </table>

    ${dateBlock}
    ${notesBlock}

    <div style="text-align:center;margin:32px 0;">
      <a href="${orderStatusUrl}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        View your order
      </a>
    </div>
  `;

	return emailWrapper({
		title: `Payment confirmed for order ${orderNumber} — ${vendorName}`,
		previewText: `Payment confirmed for order ${orderNumber}. Total charged: ${formatCents(total)}`,
		content,
		displayName: vendorName,
		primaryColor,
		hideOrderLocalBranding: vendorSubscriptionTier === 'pro'
	});
}
