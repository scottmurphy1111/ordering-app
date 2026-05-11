import { emailWrapper } from '../base';

export function pendingApprovalReminderEmail({
	senderName,
	pendingOrders,
	dashboardUrl,
	daysOpen
}: {
	senderName: string;
	pendingOrders: Array<{ orderNumber: string; customerName: string; scheduledFor?: string }>;
	dashboardUrl: string;
	daysOpen: 1 | 3 | 7;
}) {
	const count = pendingOrders.length;
	const orderWord = count === 1 ? 'order' : 'orders';

	const urgencyLine =
		daysOpen === 1
			? `You have ${count} new custom-date ${orderWord} waiting for your approval.`
			: daysOpen === 3
				? `Reminder: ${count} custom-date ${orderWord} ${count === 1 ? 'has' : 'have'} been waiting for your approval for 3 days.`
				: `Action needed: ${count} custom-date ${orderWord} ${count === 1 ? 'has' : 'have'} been waiting for your approval for 7 days. Customers are expecting a response soon.`;

	const orderRows = pendingOrders
		.map(
			(o) => `
    <tr>
      <td style="padding:10px 12px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">
        <strong>${o.orderNumber}</strong>
      </td>
      <td style="padding:10px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">
        ${o.customerName}
      </td>
      ${
				o.scheduledFor
					? `<td style="padding:10px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${o.scheduledFor}</td>`
					: `<td style="padding:10px 12px;font-size:14px;color:#9ca3af;border-bottom:1px solid #f3f4f6;">—</td>`
			}
    </tr>`
		)
		.join('');

	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${senderName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">${urgencyLine}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Order</th>
          <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Customer</th>
          <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Requested date</th>
        </tr>
      </thead>
      <tbody>${orderRows}</tbody>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      To approve or decline, visit your <a href="${dashboardUrl}" style="color:#16a34a;text-decoration:none;font-weight:600;">Order Local dashboard</a>.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Questions? Reply to this email or reach us at <a href="mailto:hello@getorderlocal.com" style="color:#16a34a;">hello@getorderlocal.com</a>.
    </p>
  `;

	return emailWrapper({
		title: `${count} custom-date ${orderWord} pending approval`,
		previewText: urgencyLine,
		content,
		displayName: 'Order Local'
	});
}
