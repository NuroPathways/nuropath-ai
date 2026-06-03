import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { identifier } = await req.json();

    if (!identifier) {
      return Response.json({ error: 'identifier is required' }, { status: 400 });
    }

    const val = identifier.trim().toLowerCase();

    // If it looks like an email, just return it directly
    if (val.includes('@')) {
      return Response.json({ email: val });
    }

    // Otherwise treat as username — look up in ClientAccount
    const accounts = await base44.asServiceRole.entities.ClientAccount.filter({ username: val });

    if (!accounts || accounts.length === 0) {
      return Response.json({ error: 'No account found with that username.' }, { status: 404 });
    }

    const account = accounts[0];

    if (!account.email) {
      return Response.json({ error: 'No email associated with this account. Please contact your clinician.' }, { status: 404 });
    }

    return Response.json({ email: account.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});