import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.app_role !== 'clinician' && user.role !== 'admin') {
      return Response.json({ error: 'Only clinicians can create client accounts' }, { status: 403 });
    }

    const { accountType, familyName, notes, parentName, token, accountEmail, children = [], clientAccount } = await req.json();

    if (!familyName || !token || !accountEmail || !clientAccount?.username) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the Family record
    const fam = await base44.asServiceRole.entities.Family.create({
      family_name: familyName,
      notes: notes || undefined,
      clinician_id: user.id,
      invite_token: token,
      invite_email: accountEmail,
      invite_status: 'pending',
      parent_name: parentName || undefined,
      account_type: accountType,
    });

    // Create the children
    for (const child of children) {
      await base44.asServiceRole.entities.Child.create({
        ...child,
        family_id: fam.id,
        clinician_id: user.id,
        parent_email: accountEmail,
      });
    }

    // Create the client login account (username + access code)
    await base44.asServiceRole.entities.ClientAccount.create({
      ...clientAccount,
      email: accountEmail,
      family_id: fam.id,
      clinician_id: user.id,
      invite_token: token,
      is_active: true,
    });

    return Response.json({ success: true, family_id: fam.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});