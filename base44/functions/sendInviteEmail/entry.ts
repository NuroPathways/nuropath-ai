import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Must be called by an authenticated clinician
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, name, link, type, username, access_code } = await req.json();

    if (!to || !link) {
      return Response.json({ error: 'Missing required fields: to, link' }, { status: 400 });
    }

    const isFamily = type === 'parent_family' || type === 'caregiver';

    const subject = isFamily
      ? "You're invited to NeuroPathways — Your Client's Support Platform"
      : "You're invited to NeuroPathways — Your Personal Support Platform";

    const loginUrl = `${new URL(link).origin}/UsernameLogin`;

    const credentialSection = username && access_code
      ? `<div style="background:#f5f7fa;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px 0;font-weight:600;color:#2d3748;font-size:14px;">🔐 Your Login Credentials</p>
          <p style="margin:4px 0;font-size:14px;color:#4a5568;"><strong>Username:</strong> <span style="font-family:monospace;background:#edf2f7;padding:2px 6px;border-radius:4px;">${username}</span></p>
          <p style="margin:4px 0;font-size:14px;color:#4a5568;"><strong>Access Code:</strong> <span style="font-family:monospace;background:#edf2f7;padding:2px 6px;border-radius:4px;">${access_code}</span></p>
          <p style="margin:8px 0 0 0;font-size:13px;color:#718096;">Sign in at: <a href="${loginUrl}" style="color:#4a6fa5;">${loginUrl}</a></p>
        </div>`
      : '';

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#2d3748;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#4a6fa5;border-radius:12px;padding:12px 20px;">
            <span style="color:white;font-weight:700;font-size:18px;">NeuroPathways</span>
          </div>
        </div>

        <h2 style="font-size:20px;font-weight:600;color:#1a202c;margin:0 0 8px 0;">Hi ${name || 'there'},</h2>

        <p style="color:#4a5568;line-height:1.6;margin:0 0 16px 0;">
          ${isFamily
            ? "Your clinician has set up a profile on NeuroPathways for you and your client. You now have access to care plans, behavioral support strategies, and AI-powered guidance — available 24/7."
            : "Your clinician has set up your personal profile on NeuroPathways. You now have access to your personalized goals, progress tracking, and AI-powered support resources."}
        </p>

        ${credentialSection}

        <div style="margin:20px 0;">
          <p style="font-size:14px;color:#4a5568;margin:0 0 12px 0;">
            <strong>First time setup:</strong> Click the button below to activate your account:
          </p>
          <a href="${link}" style="display:inline-block;background:#4a6fa5;color:white;padding:14px 28px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15px;">
            Activate My Account →
          </a>
        </div>

        <p style="font-size:13px;color:#718096;line-height:1.6;margin:16px 0 0 0;">
          If the button doesn't work, copy this link: <a href="${link}" style="color:#4a6fa5;">${link}</a>
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;text-align:center;">
          If you have any questions, reach out to your clinician directly.<br/>
          — The NeuroPathways Team
        </p>
      </div>
    `;

    const bodyText = `Hi ${name || 'there'},\n\nYour clinician has set up your profile on NeuroPathways.\n\n${username ? `Username: ${username}\nAccess Code: ${access_code}\nLogin at: ${loginUrl}\n\n` : ''}Activate your account: ${link}\n\n— The NeuroPathways Team`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NeuroPathways <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlBody,
        text: bodyText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[sendInviteEmail] Resend error:', data);
      return Response.json({ error: data.message || 'Failed to send email' }, { status: 500 });
    }

    console.log(`[sendInviteEmail] Email sent to ${to}, id: ${data.id}`);
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('[sendInviteEmail] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});