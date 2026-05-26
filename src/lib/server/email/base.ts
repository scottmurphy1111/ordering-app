// Hardcoded production URL — emails ship from server-side runtime and the
// asset must be reachable from any recipient's email client. Outlook desktop
// ignores background-image on <td> and falls back to the solid color (acceptable).
const PATTERN_URL = 'https://getorderlocal.com/email-assets/pattern-header.png';

export function emailWrapper({
	title,
	previewText,
	content,
	displayName,
	primaryColor = '#000000',
	hideOrderLocalBranding = false,
	useOrderLocalPattern = false
}: {
	title: string;
	previewText: string;
	content: string;
	displayName: string;
	primaryColor?: string;
	hideOrderLocalBranding?: boolean;
	useOrderLocalPattern?: boolean;
}) {
	const footerRow = hideOrderLocalBranding
		? ''
		: `<tr>
            <td style="padding:24px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Powered by <a href="https://getorderlocal.com" style="color:#9ca3af;">Order Local</a>
              </p>
            </td>
          </tr>`;

	const headerStyle = useOrderLocalPattern
		? `background-color:${primaryColor};background-image:url('${PATTERN_URL}');background-repeat:no-repeat;background-position:center;background-size:cover;padding:24px 32px;border-radius:12px 12px 0 0;`
		: `background:${primaryColor};padding:24px 32px;border-radius:12px 12px 0 0;`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="${headerStyle}">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${displayName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          ${footerRow}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatCents(cents: number) {
	return `$${(cents / 100).toFixed(2)}`;
}

export function orderItemsTable(
	items: Array<{
		name: string;
		quantity: number;
		basePrice: number;
		selectedModifiers?: Array<{ name: string; priceAdjustment: number }>;
	}>
) {
	const rows = items
		.map((item) => {
			const effectiveUnitPrice =
				item.basePrice + (item.selectedModifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0);
			const modifiers = item.selectedModifiers?.length
				? `<br/><span style="color:#6b7280;font-size:12px;">${item.selectedModifiers.map((m) => m.name).join(', ')}</span>`
				: '';
			return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">
          ${item.name}${modifiers}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;text-align:right;">${formatCents(effectiveUnitPrice * item.quantity)}</td>
      </tr>`;
		})
		.join('');

	return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#6b7280;text-align:center;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:#6b7280;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
