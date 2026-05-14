import { emailWrapper } from '../base';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function specialOrderQuoteExpiredEmail({
	vendorName,
	primaryColor,
	customerName,
	requestUrl
}: {
	vendorName: string;
	primaryColor?: string;
	customerName: string;
	requestUrl: string;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Your quote has expired</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${escapeHtml(customerName)}, the quote from ${escapeHtml(vendorName)} for your custom order request is no longer available.</p>

    <div style="margin-bottom:24px;padding:20px;background:#f9fafb;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">If you're still interested, you can submit a new request directly to ${escapeHtml(vendorName)}. They'd be happy to put together a fresh quote for you.</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="text-align:center;">
          <a href="${requestUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            Submit a new request
          </a>
        </td>
      </tr>
    </table>
  `;

	return emailWrapper({
		title: `Your quote from ${vendorName} has expired`,
		previewText: `Your custom order quote from ${vendorName} is no longer available`,
		content,
		displayName: vendorName,
		primaryColor
	});
}
