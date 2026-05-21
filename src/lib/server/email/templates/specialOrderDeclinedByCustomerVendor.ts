import { emailWrapper } from '../base';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function specialOrderDeclinedByCustomerVendorEmail({
	vendorName,
	primaryColor,
	customerName,
	customerEmail,
	description,
	targetDate,
	quotedPriceCents,
	requestUrl
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	customerEmail: string;
	description: string;
	targetDate: string | null;
	quotedPriceCents: number;
	requestUrl: string;
}): string {
	const targetDateFormatted = targetDate
		? new Intl.DateTimeFormat('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			}).format(new Date(targetDate + 'T12:00:00Z'))
		: null;

	const priceFormatted = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(quotedPriceCents / 100);

	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
      Quote declined by customer
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      ${escapeHtml(customerName)} declined the quote you sent for their special-order request. The request is now closed; no further action is needed.
    </p>

    <div style="margin:24px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Customer</p>
      <p style="margin:0;font-size:14px;color:#374151;">
        ${escapeHtml(customerName)}<br/>
        <a href="mailto:${escapeHtml(customerEmail)}" style="color:#3b82f6;">${escapeHtml(customerEmail)}</a>
      </p>
    </div>

    <div style="margin:24px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Quoted price</p>
      <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(priceFormatted)}</p>
    </div>

    ${
			targetDateFormatted
				? `<div style="margin:24px 0;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Desired date</p>
          <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(targetDateFormatted)}</p>
        </div>`
				: ''
		}

    <div style="margin:24px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Description</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-wrap;">${escapeHtml(description)}</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:32px;">
      <tr>
        <td style="text-align:center;">
          <a href="${requestUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            View request
          </a>
        </td>
      </tr>
    </table>
  `;

	return emailWrapper({
		title: `Quote declined by ${customerName}`,
		previewText: `${customerName} declined your quote for their special-order request.`,
		displayName: vendorName,
		primaryColor,
		content
	});
}
