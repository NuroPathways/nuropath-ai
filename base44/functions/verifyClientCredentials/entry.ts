import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, access_code } = await req.json();

    if (!username || !access_code) {
      return Response.json({ error: 'Username and access code are required' }, { status: 400 });
    }

    // Look up the ClientAccount by username
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

    // Fetch linked family
    let family = null;
    if (account.family_id) {
      const families = await base44.asServiceRole.entities.Family.filter({ id: account.family_id }).catch(() => []);
      family = families[0] || null;
    }

    // Fetch linked children via family_id
    let children = [];
    if (account.family_id) {
      children = await base44.asServiceRole.entities.Child.filter({ family_id: account.family_id }).catch(() => []);
    }

    // Build a stable synthetic user ID from the ClientAccount id
    // This is the "user id" used for RLS and parent_id on child records
    const syntheticUserId = account.id;

    // Auto-link: write parent_id on children that don't have one yet
    // so RLS filters work correctly for documents and child records
    const linkPromises = children
      .filter(c => !c.parent_id)
      .map(c => base44.asServiceRole.entities.Child.update(c.id, {
        parent_id: syntheticUserId,
        parent_email: account.email || c.parent_email,
      }).catch(() => null));

    // Also mark family as accepted if still pending
    if (family && family.invite_status === 'pending') {
      linkPromises.push(
        base44.asServiceRole.entities.Family.update(family.id, { invite_status: 'accepted' }).catch(() => null)
      );
    }

    if (linkPromises.length > 0) {
      await Promise.all(linkPromises);
      // Re-fetch children with updated parent_ids
      if (account.family_id) {
        children = await base44.asServiceRole.entities.Child.filter({ family_id: account.family_id }).catch(() => children);
      }
    }

    // Fetch documents visible to this client (by parent_id or clinician-assigned)
    const childIds = children.map(c => c.id);
    let documents = [];
    if (childIds.length > 0) {
      // Fetch docs for the first child (primary client) — frontend will handle multi-child
      documents = await base44.asServiceRole.entities.Document.filter({ parent_id: syntheticUserId }).catch(() => []);
      // Also link any documents attached to children that don't have parent_id set yet
      const docsNeedingLink = await base44.asServiceRole.entities.Document.filter({ child_id: children[0]?.id }).catch(() => []);
      const unlinkDocs = docsNeedingLink.filter(d => !d.parent_id);
      if (unlinkDocs.length > 0) {
        await Promise.all(
          unlinkDocs.map(d => base44.asServiceRole.entities.Document.update(d.id, { parent_id: syntheticUserId }).catch(() => null))
        );
        documents = [...documents, ...unlinkDocs];
      }
    }

    console.log(`[verifyClientCredentials] Login success: ${account.username}, family: ${account.family_id}, children: ${children.length}`);

    return Response.json({
      success: true,
      session: {
        id: syntheticUserId,
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
        linked_clinician_id: account.clinician_id,
        linked_family_id: account.family_id,
        children: children || [],
      }
    });
  } catch (error) {
    console.error('[verifyClientCredentials] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});