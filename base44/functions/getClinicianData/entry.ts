import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = base44.asServiceRole.entities;
    const isAdmin = user.role === 'admin';
    const q = isAdmin ? {} : { clinician_id: user.id };

    const [children, families, clientAccounts, messages, allLogs] = await Promise.all([
      svc.Child.filter(q),
      svc.Family.filter(q),
      svc.ClientAccount.filter(q),
      svc.Message.filter({ to_user_id: user.id }),
      svc.BehaviorLog.filter({}),
    ]);

    const kidIds = new Set(children.map(k => k.id));
    const logs = allLogs.filter(l => kidIds.has(l.child_id));

    return Response.json({ children, families, clientAccounts, messages, logs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});