import { emailWrapper } from '../base';

/**
 * One-time founder-voice welcome email, sent when a vendor first creates an
 * account. Guides them through the four steps to get their shop live and
 * invites a reply. Greeting falls back to "there" when no name is present.
 */
export function welcomeVendorEmail({
	recipientName,
	dashboardUrl
}: {
	recipientName?: string;
	dashboardUrl: string;
}) {
	const firstName = recipientName?.trim()?.split(' ')[0] || 'there';

	const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${firstName},</p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Welcome to Order Local — I'm really glad you're here. You've just taken the first step toward giving your customers a clean, professional way to order from you, and I'd love to help you make the rest easy.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      First, the reassuring part: there's no pressure and nothing to pay. Explore at your own pace, and only upgrade if and when you're ready to grow.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      When you're ready to take your first order, here are the four steps to get your shop live:
    </p>

    <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#374151;line-height:1.6;">
      <li style="margin:0 0 10px;">
        <strong style="color:#111827;">Connect Stripe</strong> — so payments land straight in your bank. You keep 100% of your sales; we never touch your money.
      </li>
      <li style="margin:0 0 10px;">
        <strong style="color:#111827;">Add a few products</strong> — photos, prices, and pickup windows. Even two or three items is enough to open.
      </li>
      <li style="margin:0 0 10px;">
        <strong style="color:#111827;">Make it yours</strong> — add your logo and colors so your storefront looks like your business, not a template.
      </li>
      <li style="margin:0;">
        <strong style="color:#111827;">Share your link</strong> — put it in your Instagram bio or print the QR code for your booth, and take that first pre-order.
      </li>
    </ol>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td>
          <a href="${dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Go to your dashboard →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Your dashboard checklist walks you through each step in order, so you'll always know what's next.
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      And if you ever get stuck — or just want to say hi — reply right to this email. It comes straight to me, and I read every one.
    </p>

    <p style="margin:0;font-size:14px;color:#111827;line-height:1.6;">
      Welcome aboard,<br />
      Scott<br />
      <span style="color:#6b7280;">Founder, Order Local</span>
    </p>
  `;

	return emailWrapper({
		title: 'Welcome to Order Local',
		previewText: 'A quick guide to setting up your shop. No rush, and nothing to pay.',
		content,
		displayName: 'Order Local',
		primaryColor: '#16a34a',
		useOrderLocalPattern: true
	});
}
