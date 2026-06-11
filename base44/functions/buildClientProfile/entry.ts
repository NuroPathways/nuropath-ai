import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Builds (or rebuilds) the structured ClientProfile for a child by reading ALL their
// uploaded documents. This is the single source of truth the "I Need Help Now" feature reads from.
// Payload: { child_id } to build one, or { all: true } (clinician/admin) to rebuild every assigned client.

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    diagnoses: { type: "array", items: { type: "string" } },
    goals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          timeline: { type: "string", enum: ["daily", "weekly", "biweekly", "monthly", "every_3_months", "every_6_months", "yearly"] }
        }
      }
    },
    objectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          target_behavior: { type: "string" },
          measurable_outcome: { type: "string" },
          completion_criteria: { type: "string" },
          estimated_completion: { type: "string" }
        }
      }
    },
    behaviors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          emoji: { type: "string" },
          description: { type: "string" },
          what_may_be_happening: { type: "string" },
          triggers: { type: "array", items: { type: "string" } },
          linked_goals: { type: "array", items: { type: "string" } },
          interventions: { type: "array", items: { type: "string" } },
          clinical_interventions: { type: "array", items: { type: "string" } },
          avoid: { type: "array", items: { type: "string" } },
          when_to_contact_clinician: { type: "string" }
        }
      }
    },
    triggers: { type: "array", items: { type: "string" } },
    reinforcers: { type: "array", items: { type: "string" } },
    safety_procedures: { type: "array", items: { type: "string" } },
    crisis_plan: { type: "array", items: { type: "string" } }
  }
};

const FREQ = ["daily", "weekly", "biweekly", "monthly", "every_3_months", "every_6_months", "yearly"];

async function buildForChild(base44, child) {
  const docs = await base44.asServiceRole.entities.Document.filter({ child_id: child.id }).catch(() => []);
  const docsWithFiles = docs.filter(d => d.file_url);

  const prompt = `You are a behavioral health specialist building a structured clinical profile for ${child.child_name}. Read the attached clinical document(s) (intake assessments, treatment plans, behavior intervention plans/BIP, functional behavior assessments/FBA, session notes, ABC data, crisis/safety plans, progress notes, parent training notes, school reports, quarterly reviews).

Extract everything present in these specific documents:

1. diagnoses — every diagnosis mentioned (ADHD, ASD, Anxiety, APD, etc.)
2. goals — every treatment goal, each with a plain-language title, short description, and a timeline (daily, weekly, biweekly, monthly, every_3_months, every_6_months, yearly) based on how often it's worked on.
3. objectives — measurable objectives: target_behavior, measurable_outcome, completion_criteria, estimated_completion.
4. behaviors — for EACH target behavior the clinician is treating, create one card:
   - name: short 2-4 word label (e.g. "Homework Refusal", "Aggression", "Bedtime Refusal", "Emotional Outburst", "Elopement")
   - emoji: a fitting emoji
   - description: what this behavior looks like
   - what_may_be_happening: a simple, parent-friendly explanation of WHY this behavior happens, based on the documents
   - triggers: known triggers (list)
   - interventions: the USER VERSION — step-by-step clinician-approved actions written in plain everyday language a parent can do right now (list, in order)
   - clinical_interventions: the CLINICAL VERSION — the exact clinician wording/terminology for the same strategies (list)
   - avoid: what NOT to do (list)
   - when_to_contact_clinician: when to reach out
   - linked_goals: which treatment goals this behavior supports (list of goal titles)
5. triggers — all known triggers across behaviors
6. reinforcers — rewards/reinforcers (praise, iPad, breaks, snacks, etc.)
7. safety_procedures — crisis procedures, escalation steps, safety recommendations, emergency contacts
8. crisis_plan — ordered crisis protocol steps

CRITICAL RULES:
- TRANSLATION: "interventions" = plain everyday language (User Version). "clinical_interventions" = exact clinician wording (Clinical Version). Same meaning. Example — Clinical: "Utilize antecedent modification and differential reinforcement." User: "Reduce common triggers and reward calm participation immediately."
- NO HALLUCINATION: Only include interventions that actually appear in these documents. If a behavior has no documented strategy, leave its interventions list EMPTY. Never invent strategies.
- Only extract what is actually in these specific documents. Return empty arrays for anything not present.`;

  const mergeArr = (a, b) => [...new Set([...(a || []), ...(b || [])].map(x => (x || "").toString().trim()).filter(Boolean))];
  const mergeBehaviors = (existing, incoming) => {
    const map = new Map((existing || []).map(b => [(b.name || "").toLowerCase(), b]));
    for (const b of (incoming || [])) {
      const key = (b.name || "").toLowerCase();
      if (!key) continue;
      if (map.has(key)) {
        const prev = map.get(key);
        map.set(key, {
          ...prev, ...b,
          description: b.description || prev.description,
          what_may_be_happening: b.what_may_be_happening || prev.what_may_be_happening,
          when_to_contact_clinician: b.when_to_contact_clinician || prev.when_to_contact_clinician,
          triggers: mergeArr(prev.triggers, b.triggers),
          interventions: mergeArr(prev.interventions, b.interventions),
          clinical_interventions: mergeArr(prev.clinical_interventions, b.clinical_interventions),
          avoid: mergeArr(prev.avoid, b.avoid),
          linked_goals: mergeArr(prev.linked_goals, b.linked_goals),
        });
      } else {
        map.set(key, b);
      }
    }
    return [...map.values()];
  };
  const mergeGoals = (existing, incoming) => {
    const map = new Map((existing || []).map(g => [(g.title || "").toLowerCase(), g]));
    for (const g of (incoming || [])) {
      const key = (g.title || "").toLowerCase();
      if (key && !map.has(key)) map.set(key, g);
    }
    return [...map.values()];
  };

  const accumulated = {
    diagnoses: [], goals: [], objectives: [], behaviors: [],
    triggers: [], reinforcers: [], safety_procedures: [], crisis_plan: [],
  };

  // Scan documents in small batches (2 at a time) for reliable extraction, then merge.
  for (let i = 0; i < docsWithFiles.length; i += 2) {
    const batch = docsWithFiles.slice(i, i + 2);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: batch.map(d => d.file_url),
        response_json_schema: EXTRACT_SCHEMA
      });
      if (r) {
        accumulated.diagnoses = mergeArr(accumulated.diagnoses, r.diagnoses);
        accumulated.goals = mergeGoals(accumulated.goals, r.goals);
        accumulated.objectives = [...accumulated.objectives, ...(r.objectives || [])];
        accumulated.behaviors = mergeBehaviors(accumulated.behaviors, r.behaviors);
        accumulated.triggers = mergeArr(accumulated.triggers, r.triggers);
        accumulated.reinforcers = mergeArr(accumulated.reinforcers, r.reinforcers);
        accumulated.safety_procedures = mergeArr(accumulated.safety_procedures, r.safety_procedures);
        accumulated.crisis_plan = mergeArr(accumulated.crisis_plan, r.crisis_plan);
      }
    } catch (e) { /* skip batch */ }
  }

  if (accumulated.diagnoses.length === 0 && child.diagnosis) {
    accumulated.diagnoses = child.diagnosis.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  }

  // Persist profile
  const existing = await base44.asServiceRole.entities.ClientProfile.filter({ child_id: child.id }).catch(() => []);
  const payload = {
    ...accumulated,
    source_doc_ids: docsWithFiles.map(d => d.id),
    clinician_id: child.clinician_id,
    parent_id: child.parent_id,
  };
  let profile;
  if (existing.length > 0) {
    profile = await base44.asServiceRole.entities.ClientProfile.update(existing[0].id, payload);
  } else {
    profile = await base44.asServiceRole.entities.ClientProfile.create({ child_id: child.id, ...payload });
  }

  // Mark documents scanned
  for (const d of docsWithFiles) {
    base44.asServiceRole.entities.Document.update(d.id, { scan_status: "done" }).catch(() => {});
  }

  // Sync goals into RewardToken (dashboard goal widget) with frequencies
  const existingTokens = await base44.asServiceRole.entities.RewardToken.filter({ child_id: child.id }).catch(() => []);
  const existingTitles = new Set(existingTokens.map(t => (t.goal_title || "").toLowerCase()));
  for (const goal of accumulated.goals) {
    if (!goal.title || existingTitles.has(goal.title.toLowerCase())) continue;
    base44.asServiceRole.entities.RewardToken.create({
      child_id: child.id,
      parent_id: child.parent_id,
      clinician_id: child.clinician_id,
      goal_title: goal.title,
      goal_description: goal.description || "",
      frequency: FREQ.includes(goal.timeline) ? goal.timeline : "weekly",
      progress: 0,
      target: 10,
      source: "document",
      created_by_clinician: true,
    }).catch(() => {});
  }

  return { child_id: child.id, child_name: child.child_name, behaviors: accumulated.behaviors.length, goals: accumulated.goals.length, docs: docsWithFiles.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (body.all) {
      // Rebuild for all clients assigned to this clinician (or all clients if admin)
      const isClinician = user.app_role === "clinician" || user.role === "clinician";
      const isAdmin = user.role === "admin";
      if (!isClinician && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const children = isAdmin
        ? await base44.asServiceRole.entities.Child.list("-created_date", 500)
        : await base44.asServiceRole.entities.Child.filter({ clinician_id: user.id }, "-created_date", 500);

      const results = [];
      for (const child of children) {
        try {
          results.push(await buildForChild(base44, child));
        } catch (e) {
          results.push({ child_id: child.id, error: e.message });
        }
      }
      return Response.json({ success: true, count: results.length, results });
    }

    if (!body.child_id) return Response.json({ error: 'child_id required' }, { status: 400 });
    const children = await base44.asServiceRole.entities.Child.filter({ id: body.child_id }).catch(() => []);
    const child = children[0];
    if (!child) return Response.json({ error: 'Child not found' }, { status: 404 });

    const result = await buildForChild(base44, child);
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});