import { emailWrapper, formatCents } from '../base';

export function alternateDeclinedEmail({
	vendorName,
	primaryColor,
	orderNumber,
	customerName,
	total
}: {
	vendorName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	total: number;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Order cancelled</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${customerName}, unfortunately we weren't able to find a pickup date that works for your order ${orderNumber}.</p>

    <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:24px;border-left:4px solid #ef4444;">
      <p style="margin:0;font-size:14px;color:#991b1b;">Your card has not been charged — no payment was collected for this order.</p>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">The order total would have been <strong>${formatCents(total)}</strong>. If you'd like to try again, please place a new order and choose a different pickup date.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">If you have any questions, please contact ${vendorName} directly.</p>
  `;

	return emailWrapper({
		title: `Order ${orderNumber} cancelled — ${vendorName}`,
		previewText: `Your order ${orderNumber} from ${vendorName} has been cancelled — we couldn't find a pickup date.`,
		content,
		displayName: vendorName,
		primaryColor
	});
}
