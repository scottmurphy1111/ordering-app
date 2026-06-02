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

/**
 * Customer-facing reminder to pay the outstanding balance on a deposit-split
 * special order. Sent ahead of the due date (upcoming) or once after it passes
 * (overdue). Email only — never auto-charges; the button opens the pay link.
 */
export function specialOrderBalanceReminderEmail({
	vendorName,
	primaryColor,
	vendorSubscriptionTier,
	customerName,
	orderNumber,
	balanceCents,
	balanceDueAt,
	payUrl,
	isOverdue,
	vendorTimezone = 'America/New_York'
}: {
	vendorName: string;
	primaryColor?: string;
	vendorSubscriptionTier?: string;
	customerName: string;
	orderNumber: string;
	balanceCents: number;
	balanceDueAt: Date | string;
	payUrl: string;
	isOverdue: boolean;
	vendorTimezone?: string;
}) {
	const dueLabel = fmtDate(balanceDueAt, vendorTimezone);
	const headline = isOverdue ? 'Your balance is past due' : 'Your balance is coming due';
	const lead = isOverdue
		? `Hi ${escapeHtml(customerName)}, the balance for your order from ${escapeHtml(vendorName)} was due ${escapeHtml(dueLabel)}. Please pay it to keep your order on track.`
		: `Hi ${escapeHtml(customerName)}, the balance for your order from ${escapeHtml(vendorName)} is due ${escapeHtml(dueLabel)}.`;

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">${headline}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${lead}</p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Order number</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#111827;font-family:monospace;">${escapeHtml(orderNumber)}</p>
    </div>

    <div style="margin-bottom:24px;padding:20px;background:${isOverdue ? '#fef2f2' : '#f0fdf4'};border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Balance ${isOverdue ? 'past due' : 'due'}</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#111827;">${formatCents(balanceCents)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">${isOverdue ? 'Was due' : 'Due'} ${escapeHtml(dueLabel)}</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="text-align:center;">
          <a href="${payUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            Pay balance
          </a>
        </td>
      </tr>
    </table>
  `;

	return emailWrapper({
		title: `Balance ${isOverdue ? 'past due' : 'due'} for order ${orderNumber} — ${vendorName}`,
		previewText: isOverdue
			? `Your balance of ${formatCents(balanceCents)} for order ${orderNumber} is past due`
			: `Your balance of ${formatCents(balanceCents)} for order ${orderNumber} is due ${dueLabel}`,
		content,
		displayName: vendorName,
		primaryColor,
		hideOrderLocalBranding: vendorSubscriptionTier === 'pro'
	});
}
