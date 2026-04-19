import { emailWrapper } from '../base';

export function inviteEmail({
	tenantName,
	primaryColor,
	invitedByName,
	role,
	inviteUrl
}: {
	tenantName: string;
	primaryColor?: string;
	invitedByName: string;
	role: string;
	inviteUrl: string;
}) {
	const content = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">You're invited!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${invitedByName} has invited you to join <strong>${tenantName}</strong> as a <strong>${role}</strong>.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteUrl}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Accept invitation
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">This invitation expires in 7 days.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      Or copy this link: <a href="${inviteUrl}" style="color:#6b7280;word-break:break-all;">${inviteUrl}</a>
    </p>
  `;

	return emailWrapper({
		title: `You're invited to join ${tenantName}`,
		previewText: `${invitedByName} invited you to join ${tenantName} on Order Local.`,
		content,
		tenantName,
		primaryColor
	});
}
