import { emailWrapper, orderItemsTable, formatCents } from '../base';

type PickupWindowSnapshot = {
	windowId: number;
	name: string;
	startsAt: string;
	endsAt: string;
	notes: string | null;
	location: { name: string; address: unknown | null; notes: string | null } | null;
};

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

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
	pickupMode: 'pickup_event' | 'storefront_hours' | 'custom_date',
	snapshot: PickupWindowSnapshot | null | undefined,
	scheduledFor: Date | string | null | undefined,
	tz: string,
	vendorName: string
): string {
	if (snapshot) {
		const dateLine = fmtDate(snapshot.startsAt, tz);
		const timeLine = `${fmtTime(snapshot.startsAt, tz)} – ${fmtTime(snapshot.endsAt, tz)}`;
		const addr = snapshot.location?.address ? formatAddr(snapshot.location.address) : '';
		return `
    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Pickup details</p>
      <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(dateLine)}</p>
      <p style="margin:0 0 4px;font-size:14px;color:#374151;">${escapeHtml(timeLine)}</p>
      ${snapshot.location?.name ? `<p style="margin:0 0 2px;font-size:14px;color:#374151;">${escapeHtml(snapshot.location.name)}</p>` : ''}
      ${addr ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;">${escapeHtml(addr)}</p>` : ''}
      ${snapshot.location?.notes ? `<p style="margin:0 0 2px;font-size:13px;color:#6b7280;font-style:italic;">${escapeHtml(snapshot.location.notes)}</p>` : ''}
      ${snapshot.notes ? `<p style="margin:0;font-size:13px;color:#6b7280;">${escapeHtml(snapshot.notes)}</p>` : ''}
    </div>`;
	}

	if (pickupMode === 'storefront_hours' && !scheduledFor) {
		return `
    <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Pickup details</p>
      <p style="margin:0;font-size:14px;color:#111827;">Storefront pickup during ${escapeHtml(vendorName)}'s open hours.</p>
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
      <p style="margin:0;font-size:14px;color:#111827;">${escapeHtml(formatted)}</p>
    </div>`;
	}

	return '';
}

export function orderReceivedVendorEmail({
	vendorName,
	primaryColor,
	vendorSubscriptionTier,
	customerName,
	orderNumber,
	total,
	items,
	pickupMode = 'pickup_event',
	pickupWindowSnapshot,
	scheduledFor,
	vendorTimezone = 'America/New_York',
	orderStatusUrl
}: {
	vendorName: string;
	primaryColor?: string;
	vendorSubscriptionTier?: string;
	customerName: string;
	orderNumber: string;
	total: number;
	items: Array<{
		name: string;
		quantity: number;
		basePrice: number;
		selectedModifiers?: Array<{ name: string; priceAdjustment: number }>;
	}>;
	pickupMode?: 'pickup_event' | 'storefront_hours' | 'custom_date';
	pickupWindowSnapshot?: PickupWindowSnapshot | null;
	scheduledFor?: Date | string | null;
	vendorTimezone?: string;
	orderStatusUrl: string;
}) {
	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">You've received a new order</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      ${escapeHtml(customerName)} just placed and paid for an order. It's in your queue.
    </p>

    <div style="margin:0 0 24px;padding:20px;background:#f0fdf4;border-radius:8px;border-left:4px solid #10b981;">
      <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">Order ${escapeHtml(orderNumber)}</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${formatCents(total)}</p>
      <p style="margin:12px 0 0;font-size:14px;color:#374151;">From <strong>${escapeHtml(customerName)}</strong></p>
    </div>

    ${orderItemsTable(items)}

    ${renderPickupSection(pickupMode, pickupWindowSnapshot, scheduledFor, vendorTimezone, vendorName)}

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;">
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
		title: `New order ${orderNumber} — ${customerName}`,
		previewText: `${customerName} placed an order — ${formatCents(total)}`,
		content,
		displayName: vendorName,
		primaryColor,
		hideOrderLocalBranding: vendorSubscriptionTier === 'pro'
	});
}
