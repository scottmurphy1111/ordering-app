import { emailWrapper, formatCents } from '../base';

export function loyaltyRewardEmail({
	tenantName,
	primaryColor,
	customerName,
	promoCode,
	loyaltyType,
	rewardDescription,
	redeemValue
}: {
	tenantName: string;
	primaryColor?: string;
	customerName: string;
	promoCode: string;
	loyaltyType: 'stamps' | 'points';
	rewardDescription?: string;
	redeemValue?: number; // cents, for points rewards
}) {
	const rewardLine =
		loyaltyType === 'points' && redeemValue != null
			? `<strong>${formatCents(redeemValue)} off</strong> your next order`
			: rewardDescription
				? `<strong>${rewardDescription}</strong>`
				: 'a free item on your next order';

	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">You've earned a reward!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Great news, ${customerName}! You've reached a loyalty milestone at ${tenantName}.
    </p>

    <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Your reward</p>
      <p style="margin:0 0 16px;font-size:18px;color:#111827;">${rewardLine}</p>
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Promo code</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#111827;font-family:monospace;letter-spacing:0.1em;">${promoCode}</p>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
      Enter this code at checkout to apply your reward. It's valid for a single use, so save it for your next order.
    </p>
  `;

	return emailWrapper({
		title: `You've earned a reward at ${tenantName}!`,
		previewText: `Your loyalty reward is ready — use code ${promoCode} at checkout.`,
		content,
		tenantName,
		primaryColor
	});
}
