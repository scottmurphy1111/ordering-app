import { emailWrapper, formatCents } from '../base';

export function customDatePaymentFailedEmail({
	vendorName,
	primaryColor,
	vendorSubscriptionTier,
	orderNumber,
	customerName,
	total,
	recoveryUrl
}: {
	vendorName: string;
	primaryColor?: string;
	vendorSubscriptionTier?: string;
	orderNumber: string;
	customerName: string;
	total: number;
	recoveryUrl: string;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Payment couldn't be processed</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hey ${customerName}, we weren't able to charge your saved card for order <strong>${orderNumber}</strong> (${formatCents(total)}).</p>

    <p style="margin:0 0 24px;font-size:15px;color:#374151;">To complete your order, please update your payment method using the button below.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${recoveryUrl}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Update payment method
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      If you have questions, contact ${vendorName} directly.
    </p>
  `;

	return emailWrapper({
		title: `Payment issue — order ${orderNumber} — ${vendorName}`,
		previewText: `Action needed: update your payment method for order ${orderNumber}.`,
		content,
		displayName: vendorName,
		primaryColor,
		hideOrderLocalBranding: vendorSubscriptionTier === 'pro'
	});
}
