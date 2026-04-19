import { emailWrapper, formatCents } from '../base';

export function orderCancelledEmail({
	tenantName,
	primaryColor,
	orderNumber,
	customerName,
	total,
	reason
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	total: number;
	reason?: string;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Order cancelled</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${customerName}, your order ${orderNumber} has been cancelled.</p>

    ${reason ? `<div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;border-left:4px solid #ef4444;">
      <p style="margin:0;font-size:14px;color:#991b1b;"><strong>Reason:</strong> ${reason}</p>
    </div>` : ''}

    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">If you were charged, a full refund of <strong>${formatCents(total)}</strong> will be returned to your original payment method within 5–10 business days.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">If you have any questions, please contact ${tenantName} directly.</p>
  `;

	return emailWrapper({
		title: `Order ${orderNumber} cancelled — ${tenantName}`,
		previewText: `Your order ${orderNumber} from ${tenantName} has been cancelled.`,
		content,
		tenantName,
		primaryColor
	});
}
