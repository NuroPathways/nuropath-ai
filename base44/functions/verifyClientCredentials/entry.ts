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

    if ((account.access_code || '').trim().toUpperCase() !== access_code.trim().toUpperCase()) {
      return Response.json({ error: 'Invalid username or access code' }, { status: 401 });
    }

    if (account.is_active === false) {
      return Response.json({ error: 'This account has been deactivated. Please contact your clinician.' }, { status: 403 });
    }

    // Fetch linked children using service role
    const children = await base44.asServiceRole.entities.Child.filter({ family_id: account.family_id });

    return Response.json({
      success: true,
      session: {
        id: account.id,
        username: account.username,
        first_name: account.first_name,
        last_name: account.last_name,
        full_name: `${account.first_name} ${account.last_name}`.trim(),
        email: account.email,
        family_id: account.family_id,
        clinician_id: account.clinician_id,
        account_type: account.account_type,
        invite_token: account.invite_token,
        app_role: 'parent',
        children: children || [],
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});