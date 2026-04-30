import { emailWrapper, orderItemsTable, formatCents } from '../base';

type PickupWindowSnapshot = {
	windowId: number;
	name: string;
	startsAt: string;
	endsAt: string;
	notes: string | null;
	location: { name: string; address: unknown | null; notes: string | null } | null;
};

function formatAddr(addr: unknown): string {
	if (!addr || typeof addr !== 'object') return '';
	const a = addr as { street?: string; city?: string; state?: string };
	return [a.street, a.city, a.state].filter(Boolean).join(', ');
}

function fmtDate(iso: string, tz: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(new Date(iso));
}

function fmtTime(iso: string, tz: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(new Date(iso));
}

function renderPickupSection(
	snapshot: PickupWindowSnapshot | null | undefined,
	scheduledFor: Date | string | null | undefined,
	tz: string
): string {
	if (snapshot) {
		const dateLine = fmtDate(snapshot.startsAt, tz);
		const timeLine = `${fmtTime(snapshot.startsAt, tz)} – ${fmtTime(snapshot.endsAt, tz)}`;
		const addr = snapshot.location?.address ? formatAddr(snapshot.location.address) : '';
		return `
    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Pickup details</p>
      <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111827;">${dateLine}</p>
      <p style="margin:0 0 4px;font-size:14px;color:#374151;">${timeLine}</p>
      ${snapshot.location?.name ? `<p style="margin:0 0 2px;font-size:14px;color:#374151;">${snapshot.location.name}</p>` : ''}
      ${addr ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">${addr}</p>` : ''}
      ${snapshot.location?.notes ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;font-style:italic;">${snapshot.location.notes}</p>` : ''}
      ${snapshot.notes ? `<p style="margin:0;font-size:13px;color:#6b7280;">${snapshot.notes}</p>` : ''}
    </div>`;
	}

	if (scheduledFor) {
		const d = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor;
		const formatted = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(d);
		return `
    <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #e5e7eb;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Pickup time</p>
      <p style="margin:0;font-size:14px;color:#111827;">${formatted}</p>
    </div>`;
	}

	return '';
}

export function orderConfirmedEmail({
	tenantName,
	primaryColor,
	orderNumber,
	customerName,
	items,
	subtotal,
	tax,
	tip,
	total,
	orderType,
	notes,
	pickupWindowSnapshot,
	scheduledFor,
	vendorTimezone = 'America/New_York'
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	items: Array<{
		name: string;
		quantity: number;
		basePrice: number;
		selectedModifiers?: Array<{ name: string; priceAdjustment: number }>;
	}>;
	subtotal: number;
	tax: number;
	tip: number;
	total: number;
	orderType: string;
	notes?: string | null;
	pickupWindowSnapshot?: PickupWindowSnapshot | null;
	scheduledFor?: Date | string | null;
	vendorTimezone?: string;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Order confirmed!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Thanks, ${customerName}. We've received your order and payment.</p>

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
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;border-top:2px solid #111827;">Total</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #111827;">${formatCents(total)}</td>
      </tr>
    </table>

    ${notes ? `<p style="margin:24px 0 0;font-size:14px;color:#6b7280;"><strong>Notes:</strong> ${notes}</p>` : ''}

    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0;font-size:14px;color:#15803d;">
        <strong>Order type:</strong> ${orderType}
      </p>
    </div>

    ${renderPickupSection(pickupWindowSnapshot, scheduledFor, vendorTimezone)}
  `;

	return emailWrapper({
		title: `Order ${orderNumber} confirmed — ${tenantName}`,
		previewText: `Your order ${orderNumber} is confirmed. Total: ${formatCents(total)}`,
		content,
		tenantName,
		primaryColor
	});
}
