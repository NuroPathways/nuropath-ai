import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const { action, goal_id, child_id, data = {}, account_id, invite_token } = await req.json();
    const svc = base44.asServiceRole.entities;

    if (!child_id) return Response.json({ error: 'child_id required' }, { status: 400 });
    const child = (await svc.Child.filter({ id: child_id }))[0] || null;
    if (!child) return Response.json({ error: 'Child not found' }, { status: 404 });

    // Authorization: logged-in users
    let authorized = false;
    let actorId = null;
    if (user) {
      actorId = user.id;
      authorized = user.role === 'admin' ||
        child.clinician_id === user.id ||
        child.parent_id === user.id ||
        (child.parent_email && child.parent_email === user.email);
      if (!authorized && user.email) {
        const accounts = await svc.ClientAccount.filter({ email: user.email }).catch(() => []);
        authorized = accounts.some(a => a.is_active !== false &&
          ((a.family_id && a.family_id === child.family_id) || a.id === child.parent_id));
      }
    }
    // Username+code client sessions
    if (!authorized && account_id && invite_token) {
      const account = (await svc.ClientAccount.filter({ id: account_id }))[0] || null;
      if (account && account.invite_token === invite_token && account.is_active !== false &&
        (child.family_id === account.family_id || child.parent_id === account.id)) {
        authorized = true;
        actorId = account.id;
      }
    }
    if (!authorized) return Response.json({ error: 'Not authorized' }, { status: 401 });

    if (action === 'create') {
      const record = await svc.RewardToken.create({
        ...data,
        child_id,
        parent_id: data.parent_id || actorId,
        clinician_id: child.clinician_id,
      });
      return Response.json({ success: true, record });
    }

    if (action === 'update') {
      const goal = (await svc.RewardToken.filter({ id: goal_id }))[0] || null;
      if (!goal || goal.child_id !== child_id) {
        return Response.json({ error: 'Goal not found' }, { status: 404 });
      }
      const record = await svc.RewardToken.update(goal_id, data);
      return Response.json({ success: true, record });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});