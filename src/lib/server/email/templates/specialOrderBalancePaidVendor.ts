import { emailWrapper, formatCents } from '../base';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Vendor-facing notification that a special order's balance has been paid —
 * the order is now paid in full.
 */
export function specialOrderBalancePaidVendorEmail({
	vendorName,
	primaryColor,
	customerName,
	orderNumber,
	balanceCents,
	totalCents,
	orderStatusUrl
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	orderNumber: string;
	balanceCents: number;
	totalCents: number;
	orderStatusUrl: string;
}) {
	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">Balance paid</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      ${escapeHtml(customerName)} paid the balance on their custom order. It's now paid in full.
    </p>

    <div style="margin:0 0 24px;padding:20px;background:#f0fdf4;border-radius:8px;border-left:4px solid #10b981;">
      <p style="margin:0 0 2px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">Order ${escapeHtml(orderNumber)}</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#111827;">${formatCents(balanceCents)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#374151;">Order total: <strong>${formatCents(totalCents)}</strong> — paid in full</p>
    </div>

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
		title: `Balance paid for order ${orderNumber} — ${customerName}`,
		previewText: `${customerName} paid the balance — ${formatCents(totalCents)} paid in full`,
		content,
		displayName: vendorName,
		primaryColor
	});
}
