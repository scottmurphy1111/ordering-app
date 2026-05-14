import { emailWrapper } from '../base';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function specialOrderRequestReceivedVendorEmail({
	vendorName,
	primaryColor,
	customerName,
	customerEmail,
	customerPhone,
	description,
	targetDate,
	photoCount,
	requestUrl
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	customerEmail: string;
	customerPhone: string | null;
	description: string;
	targetDate: string | null;
	photoCount: number;
	requestUrl: string;
}): string {
	const targetDateFormatted = targetDate
		? new Intl.DateTimeFormat('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			}).format(new Date(targetDate + 'T12:00:00Z'))
		: null;

	const content = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
      New special-order request
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      ${escapeHtml(customerName)} sent you a request through your storefront. Review it and send a quote, or decline if you can't take it on.
    </p>

    <div style="margin:24px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Customer</p>
      <p style="margin:0;font-size:14px;color:#374151;">
        ${escapeHtml(customerName)}<br/>
        <a href="mailto:${escapeHtml(customerEmail)}" style="color:#3b82f6;">${escapeHtml(customerEmail)}</a>
        ${customerPhone ? `<br/>${escapeHtml(customerPhone)}` : ''}
      </p>
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

    ${
			photoCount > 0
				? `<p style="margin:24px 0;font-size:14px;color:#6b7280;">${photoCount} photo${photoCount === 1 ? '' : 's'} attached — view them on the request page.</p>`
				: ''
		}

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
		title: `New special-order request from ${customerName}`,
		previewText: `${customerName} sent you a custom order request.`,
		displayName: vendorName,
		primaryColor,
		content
	});
}
