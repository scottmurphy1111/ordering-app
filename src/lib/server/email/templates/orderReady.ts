import { emailWrapper, formatCents } from '../base';

export function orderReadyEmail({
	tenantName,
	primaryColor,
	orderNumber,
	customerName,
	total,
	orderType
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	total: number;
	orderType: string;
}) {
	const isPickup = orderType.toLowerCase().includes('pickup');

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Your order is ready!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hey ${customerName}, order ${orderNumber} is ready${isPickup ? ' for pickup' : ''}.</p>

    <div style="background:#f0fdf4;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;border:1px solid #bbf7d0;">
      <p style="margin:0 0 8px;font-size:48px;">✓</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#15803d;">Ready now</p>
      <p style="margin:4px 0 0;font-size:14px;color:#16a34a;font-family:monospace;">${orderNumber}</p>
    </div>

    ${isPickup ? `<p style="margin:0;font-size:15px;color:#374151;text-align:center;">Please come in to collect your order. Show this email or your order number at the counter.</p>` : ''}

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">Total paid: ${formatCents(total)}</p>
  `;

	return emailWrapper({
		title: `Order ${orderNumber} is ready — ${tenantName}`,
		previewText: `Your order ${orderNumber} is ready${isPickup ? ' for pickup' : ''}!`,
		content,
		tenantName,
		primaryColor
	});
}
