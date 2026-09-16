/**
 * email.ts
 *
 * Server-side email utility. Uses Resend API if RESEND_API_KEY is configured.
 * Falls back to console logging in development.
 */

const FROM_ADDRESS = process.env.EMAIL_FROM || "Serene CRM <noreply@serene-crm.com>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, text } = params;

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[Email] Resend API error:", response.status, errorBody);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[Email] Failed to send via Resend:", error);
      return false;
    }
  }

  // Development fallback — log to console
  console.log(`[Email] No RESEND_API_KEY configured. Email not sent.`);
  console.log(`[Email] To: ${to}`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] (Set RESEND_API_KEY in .env.local to enable email delivery)`);
  return false;
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  const subject = "Reset Your Serene CRM Password";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">Reset Your Password</h2>
      <p style="color: #666; font-size: 14px;">
        We received a request to reset the password for your Serene CRM account.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 12px;">
        This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
      </p>
      <p style="color: #999; font-size: 11px; margin-top: 16px;">
        If the button doesn't work, copy and paste this URL into your browser:<br/>
        ${resetUrl}
      </p>
    </div>
  `;
  const text = `Reset your Serene CRM password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.`;
  return { subject, html, text };
}

export function buildOtpEmail(otp: string): { subject: string; html: string; text: string } {
  const subject = "Your Serene CRM Verification Code";
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">Serene CRM</h2>
      <p style="color: #666; font-size: 14px;">Your verification code is:</p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 12px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
      <p style="color: #999; font-size: 11px; margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px;">
        If you did not attempt to sign in, you can safely ignore this email. Your password will not be changed.
      </p>
    </div>
  `;
  const text = `Your Serene CRM verification code: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not attempt to sign in, you can safely ignore this email. Your password will not be changed.`;
  return { subject, html, text };
}

export function buildInvitationEmail(params: {
  orgName: string;
  role: string;
  inviteUrl: string;
  inviterName: string;
}): { subject: string; html: string; text: string } {
  const { orgName, role, inviteUrl, inviterName } = params;
  const roleLabel = role === "ADMIN" ? "Admin" : "Sales Person";
  const subject = `You've been invited to join ${orgName} on Serene CRM`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a;">You're Invited</h2>
      <p style="color: #666; font-size: 14px;">
        <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Serene CRM as <strong>${roleLabel}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${inviteUrl}" style="background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #666; font-size: 12px;">
        This invitation expires in 7 days. If you were not expecting this invitation, you can safely ignore this email.
      </p>
      <p style="color: #999; font-size: 11px; margin-top: 16px;">
        If the button doesn't work, copy and paste this URL into your browser:<br/>
        ${inviteUrl}
      </p>
    </div>
  `;
  const text = `${inviterName} has invited you to join ${orgName} on Serene CRM as ${roleLabel}.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days. If you were not expecting this invitation, you can safely ignore this email.`;
  return { subject, html, text };
}
