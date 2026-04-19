import { emailWrapper, orderItemsTable, formatCents } from '../base';

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
	notes
}: {
	tenantName: string;
	primaryColor?: string;
	orderNumber: string;
	customerName: string;
	items: Array<{ name: string; quantity: number; unitPrice: number; selectedModifiers?: Array<{ name: string }> }>;
	subtotal: number;
	tax: number;
	tip: number;
	total: number;
	orderType: string;
	notes?: string | null;
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
      ${tip > 0 ? `<tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;">Tip</td>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;text-align:right;">${formatCents(tip)}</td>
      </tr>` : ''}
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
  `;

	return emailWrapper({
		title: `Order ${orderNumber} confirmed — ${tenantName}`,
		previewText: `Your order ${orderNumber} is confirmed. Total: ${formatCents(total)}`,
		content,
		tenantName,
		primaryColor
	});
}
