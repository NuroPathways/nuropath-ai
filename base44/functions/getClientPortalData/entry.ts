import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { account_id, invite_token, child_id } = await req.json();
    if (!child_id) return Response.json({ error: 'Missing child_id' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const child = (await svc.Child.filter({ id: child_id }))[0] || null;
    if (!child) return Response.json({ error: 'Child not found' }, { status: 404 });

    // Authorize: either a logged-in Base44 user, or a username+code client session
    let authorized = false;
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      authorized =
        user.role === 'admin' ||
        child.clinician_id === user.id ||
        child.parent_id === user.id ||
        child.parent_email === user.email;
    }
    // Clients who signed in via email (Base44 login) — match through their
    // ClientAccount or the family's invite email.
    if (!authorized && user?.email) {
      const accounts = await svc.ClientAccount.filter({ email: user.email }).catch(() => []);
      authorized = accounts.some(a => a.is_active !== false &&
        ((a.family_id && a.family_id === child.family_id) || a.id === child.parent_id));
      if (!authorized && child.family_id) {
        const fams = await svc.Family.filter({ id: child.family_id }).catch(() => []);
        authorized = !!fams[0] && fams[0].invite_email === user.email;
      }
    }
    if (!authorized && account_id && invite_token) {
      const account = (await svc.ClientAccount.filter({ id: account_id }))[0] || null;
      authorized = !!account &&
        account.invite_token === invite_token &&
        account.is_active !== false &&
        (child.family_id === account.family_id || child.parent_id === account.id);
    }
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [plans, interventionPlans, documents, profiles, goals] = await Promise.all([
      svc.BehaviorPlan.filter({ child_id }),
      svc.InterventionPlan.filter({ child_id }),
      svc.Document.filter({ child_id }),
      svc.ClientProfile.filter({ child_id }),
      svc.RewardToken.filter({ child_id }),
    ]);

    return Response.json({ child, plans, interventionPlans, documents, profile: profiles[0] || null, goals });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});