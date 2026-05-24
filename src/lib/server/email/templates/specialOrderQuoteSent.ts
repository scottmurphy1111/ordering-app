import { emailWrapper, formatCents } from '../base';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export function specialOrderQuoteSentEmail({
	vendorName,
	primaryColor,
	vendorSubscriptionTier,
	customerName,
	priceCents,
	message,
	acceptUrl,
	declineUrl
}: {
	vendorName: string;
	primaryColor?: string;
	vendorSubscriptionTier?: string;
	customerName: string;
	priceCents: number;
	message: string | null;
	acceptUrl: string;
	declineUrl: string;
}) {
	const messageBlock = message
		? `
    <div style="margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #e5e7eb;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Message from ${escapeHtml(vendorName)}</p>
      <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${escapeHtml(message)}</p>
    </div>`
		: '';

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">You have a quote!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hey ${escapeHtml(customerName)}, ${escapeHtml(vendorName)} has sent you a quote for your custom order request.</p>

    <div style="margin-bottom:24px;padding:20px;background:#f0fdf4;border-radius:8px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Quoted price</p>
      <p style="margin:0;font-size:32px;font-weight:700;color:#111827;">${formatCents(priceCents)}</p>
    </div>

    ${messageBlock}

    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Review your quote and let ${escapeHtml(vendorName)} know if you'd like to proceed.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="text-align:center;padding-right:8px;">
          <a href="${acceptUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;width:100%;box-sizing:border-box;">
            View &amp; accept quote
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      If you'd prefer not to proceed, you can
      <a href="${declineUrl}" style="color:#9ca3af;text-decoration:underline;">decline the quote</a>.
    </p>
  `;

	return emailWrapper({
		title: `Quote from ${vendorName}`,
		previewText: `${vendorName} sent you a quote for ${formatCents(priceCents)} — review it now`,
		content,
		displayName: vendorName,
		primaryColor,
		hideOrderLocalBranding: vendorSubscriptionTier === 'pro'
	});
}
