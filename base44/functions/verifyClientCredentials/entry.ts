import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, access_code } = await req.json();

    if (!username || !access_code) {
      return Response.json({ error: 'Username and access code are required' }, { status: 400 });
    }

    const accounts = await base44.asServiceRole.entities.ClientAccount.filter({
      username: username.toLowerCase().trim()
    });

    if (!accounts || accounts.length === 0) {
      return Response.json({ error: 'Invalid username or access code' }, { status: 401 });
    }

    const account = accounts[0];

    if (account.access_code !== access_code.trim().toUpperCase()) {
      return Response.json({ error: 'Invalid username or access code' }, { status: 401 });
    }

    if (account.is_active === false) {
      return Response.json({ error: 'This account has been deactivated. Please contact your clinician.' }, { status: 403 });
    }

    return Response.json({
      success: true,
      invite_token: account.invite_token,
      first_name: account.first_name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});