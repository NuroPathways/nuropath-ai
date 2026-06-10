import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { child_id, family_id } = await req.json();
    const svc = base44.asServiceRole.entities;
    const isAdmin = user.role === 'admin';
    const canAccess = (rec) =>
      isAdmin ||
      rec.clinician_id === user.id ||
      rec.parent_id === user.id ||
      rec.parent_email === user.email ||
      rec.invite_email === user.email;

    if (child_id) {
      const child = (await svc.Child.filter({ id: child_id }))[0] || null;
      if (!child || !canAccess(child)) {
        return Response.json({ error: 'Client not found' }, { status: 404 });
      }
      const [plans, documents, accounts] = await Promise.all([
        svc.BehaviorPlan.filter({ child_id }),
        svc.Document.filter({ child_id }),
        child.family_id ? svc.ClientAccount.filter({ family_id: child.family_id }) : Promise.resolve([]),
      ]);
      return Response.json({ child, plans, documents, clientAccount: accounts[0] || null });
    }

    if (family_id) {
      const family = (await svc.Family.filter({ id: family_id }))[0] || null;
      if (!family || !canAccess(family)) {
        return Response.json({ error: 'Family not found' }, { status: 404 });
      }
      const [children, accounts] = await Promise.all([
        svc.Child.filter({ family_id }),
        svc.ClientAccount.filter({ family_id }),
      ]);
      const childIds = children.map(c => c.id);
      const fetchAll = async (Entity) =>
        (await Promise.all(childIds.map(id => Entity.filter({ child_id: id })))).flat();
      const [logs, messages, documents, interventionPlans] = await Promise.all([
        fetchAll(svc.BehaviorLog),
        fetchAll(svc.Message),
        fetchAll(svc.Document),
        fetchAll(svc.InterventionPlan),
      ]);
      return Response.json({
        family,
        children,
        clientAccount: accounts[0] || null,
        documents,
        stats: {
          logs: logs.length,
          messages: messages.length,
          documents: documents.length,
          plans: interventionPlans.length,
        },
      });
    }

    return Response.json({ error: 'Missing child_id or family_id' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});