import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, name, link, type } = await req.json();

    if (!to || !link) {
      return Response.json({ error: 'Missing required fields: to, link' }, { status: 400 });
    }

    const isFamily = type === 'family' || type === 'caregiver';

    const subject = isFamily
      ? "You're invited to NuroPathways — Your Client's Support Platform"
      : "You're invited to NuroPathways — Your Personal Support Platform";

    const bodyText = isFamily
      ? `Hi ${name || 'there'},\n\nYour clinician has set up a profile on NuroPathways for you and your client. Click the secure link below to create your account and get started:\n\n${link}\n\nOnce you sign up, you'll have access to your client's care plans, behavioral support strategies, documents, and AI-powered guidance — available 24/7.\n\nIf you have any questions, reach out to your clinician directly.\n\n— The NuroPathways Team`
      : `Hi ${name || 'there'},\n\nYour clinician has set up your personal profile on NuroPathways. Click the secure link below to create your account:\n\n${link}\n\nOnce you sign in, you'll have access to your personalized goals, progress tracking, session tools, and AI-powered support resources — available anytime.\n\nIf you have any questions, reach out to your clinician directly.\n\n— The NuroPathways Team`;

    const htmlBody = bodyText.replace(/\n/g, '<br>').replace(link, `<a href="${link}" style="color:#4a6fa5;font-weight:bold;">${link}</a>`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NuroPathways <onboarding@resend.dev>',
        to: [to],
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">${htmlBody}</div>`,
        text: bodyText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});