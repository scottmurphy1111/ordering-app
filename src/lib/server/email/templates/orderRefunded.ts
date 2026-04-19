import { emailWrapper, formatCents } from '../base';

export function orderRefundedEmail({
	tenantName,
	primaryColor,
	orderNumber,
	customerName,
	total
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	total: number;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Refund processed</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${customerName}, your refund for order ${orderNumber} has been processed.</p>

    <div style="background:#eff6ff;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#3b82f6;text-transform:uppercase;letter-spacing:0.05em;">Refund amount</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;">${formatCents(total)}</p>
    </div>

    <p style="margin:0;font-size:14px;color:#6b7280;">Please allow 5–10 business days for the refund to appear on your statement depending on your bank or card issuer.</p>
  `;

	return emailWrapper({
		title: `Refund processed for order ${orderNumber} — ${tenantName}`,
		previewText: `Your refund of ${formatCents(total)} for order ${orderNumber} has been processed.`,
		content,
		tenantName,
		primaryColor
	});
}
