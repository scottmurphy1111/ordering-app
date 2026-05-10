import { emailWrapper, formatCents } from '../base';

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

export function alternateDateProposedEmail({
	tenantName,
	primaryColor,
	orderNumber,
	customerName,
	total,
	originalDate,
	proposedDate,
	proposedReason,
	vendorTimezone = 'America/New_York',
	orderStatusUrl
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	total: number;
	originalDate: Date | string | null | undefined;
	proposedDate: Date | string;
	proposedReason: string | null | undefined;
	vendorTimezone?: string;
	orderStatusUrl: string;
}) {
	const originalBlock = originalDate
		? `<p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-decoration:line-through;">${fmtDate(originalDate, vendorTimezone)}</p>`
		: '';

	const reasonBlock = proposedReason
		? `<p style="margin:16px 0 0;font-size:14px;color:#374151;font-style:italic;">"${proposedReason}"</p>`
		: '';

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Date change proposed</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hey ${customerName}, ${tenantName} has proposed a new pickup date for order ${orderNumber}.</p>

    <div style="background:#fff7ed;border-radius:8px;border-left:4px solid #f59e0b;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Proposed date</p>
      ${originalBlock}
      <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${fmtDate(proposedDate, vendorTimezone)}</p>
      ${reasonBlock}
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Order</p>
      <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#111827;font-family:monospace;">${orderNumber}</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">Total: ${formatCents(total)}</p>
    </div>

    <p style="font-size:14px;color:#374151;margin:0 0 8px;">You can <strong>accept</strong> the new date (no charge yet — your card will be charged after you accept) or <strong>decline</strong> to cancel your order with no charge.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${orderStatusUrl}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        View &amp; respond
      </a>
    </div>
  `;

	return emailWrapper({
		title: `Date change proposed for order ${orderNumber} — ${tenantName}`,
		previewText: `${tenantName} has proposed a new pickup date for order ${orderNumber}. Tap to accept or decline.`,
		content,
		tenantName,
		primaryColor
	});
}
