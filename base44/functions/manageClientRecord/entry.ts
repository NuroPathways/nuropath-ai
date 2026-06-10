import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, entity_id, data = {} } = await req.json();
    const svc = base44.asServiceRole.entities;
    const isAdmin = user.role === 'admin';

    const owns = (rec) => isAdmin || rec?.clinician_id === user.id;

    const getOwned = async (Entity, id) => {
      const rec = (await Entity.filter({ id }))[0] || null;
      if (!rec || !owns(rec)) throw new Error('Not found or no access');
      return rec;
    };

    switch (action) {
      case 'updateChild': {
        await getOwned(svc.Child, entity_id);
        const updated = await svc.Child.update(entity_id, data);
        return Response.json({ success: true, record: updated });
      }
      case 'deleteChild': {
        await getOwned(svc.Child, entity_id);
        await svc.Child.delete(entity_id);
        return Response.json({ success: true });
      }
      case 'createChild': {
        const record = await svc.Child.create({ ...data, clinician_id: user.id });
        return Response.json({ success: true, record });
      }
      case 'updateFamily': {
        await getOwned(svc.Family, entity_id);
        const updated = await svc.Family.update(entity_id, data);
        return Response.json({ success: true, record: updated });
      }
      case 'deleteFamily': {
        await getOwned(svc.Family, entity_id);
        const kids = await svc.Child.filter({ family_id: entity_id });
        for (const kid of kids) {
          if (owns(kid)) await svc.Child.delete(kid.id);
        }
        await svc.Family.delete(entity_id);
        return Response.json({ success: true });
      }
      case 'createDocument': {
        const record = await svc.Document.create({ ...data, clinician_id: user.id });
        return Response.json({ success: true, record });
      }
      case 'deleteDocument': {
        await getOwned(svc.Document, entity_id);
        await svc.Document.delete(entity_id);
        return Response.json({ success: true });
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});