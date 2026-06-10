import { base44 } from "@/api/base44Client";

// Builds/merges a rich ClientProfile from a document. Returns extracted goals.
async function buildClientProfile(doc, clinicianId) {
  const profileSchema = {
    type: "object",
    properties: {
      diagnoses: { type: "array", items: { type: "string" } },
      goals: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" }
          },
          required: ["title"]
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
            triggers: { type: "array", items: { type: "string" } },
            linked_goals: { type: "array", items: { type: "string" } },
            interventions: { type: "array", items: { type: "string" } },
            avoid: { type: "array", items: { type: "string" } },
            when_to_contact_clinician: { type: "string" }
          },
          required: ["name"]
        }
      },
      triggers: { type: "array", items: { type: "string" } },
      reinforcers: { type: "array", items: { type: "string" } },
      safety_procedures: { type: "array", items: { type: "string" } },
      crisis_plan: { type: "array", items: { type: "string" } }
    }
  };

  const docLabel = doc.title + " (" + (doc.category || "").replace(/_/g, " ") + ")";
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: "You are a behavioral health specialist. Read this clinical document and extract a comprehensive structured client profile. Document: " + docLabel + ". Extract ONLY what is explicitly present in the document. Do NOT invent or hallucinate anything. For each target behavior, provide: name (short plain-language like Refusal, Aggression, Anxiety Attack), description, an appropriate emoji, specific triggers, which treatment goals this behavior maps to, ONLY the clinician-approved intervention steps, things to avoid, and when to contact the clinician. For goals: this is MANDATORY — you must ALWAYS return at least one goal, never leave the goals array empty. Extract each treatment goal title and description, AND infer reasonable additional treatment goals that the plan implies even if not explicitly stated as a goal (e.g. if the document describes reducing tantrums, infer a goal like 'Reduce tantrum frequency'). If the document has no explicit goals at all, derive sensible treatment goals from the behaviors, diagnoses, and interventions described so the goals array is never blank. For reinforcers: list all rewards mentioned. For safety/crisis: extract safety and crisis protocol steps.",
    file_urls: [doc.file_url],
    response_json_schema: profileSchema
  });

  if (!result || (!result.behaviors?.length && !result.goals?.length)) return null;

  // Force goals to never be blank: if the AI returned none, derive them from behaviors.
  let extractedGoals = (result.goals || []).filter(g => g && g.title);
  if (extractedGoals.length === 0) {
    extractedGoals = (result.behaviors || [])
      .filter(b => b.name)
      .map(b => ({
        title: "Reduce " + b.name.toLowerCase(),
        description: b.description || ("Work toward reducing " + b.name.toLowerCase() + "."),
      }));
    if (extractedGoals.length === 0) {
      extractedGoals = [{ title: "Establish initial treatment goals", description: "Define specific treatment goals based on this client's needs." }];
    }
  }
  result.goals = extractedGoals;

  const mergeArr = (a, b) => [...new Set([...(a || []), ...(b || [])])];

  const mergeBehaviors = (existing, incoming) => {
    const map = new Map((existing || []).map(b => [b.name && b.name.toLowerCase(), b]));
    for (const b of (incoming || [])) {
      const key = b.name && b.name.toLowerCase();
      if (key && map.has(key)) {
        const prev = map.get(key);
        map.set(key, {
          ...prev, ...b,
          triggers: mergeArr(prev.triggers, b.triggers),
          linked_goals: mergeArr(prev.linked_goals, b.linked_goals),
          interventions: mergeArr(prev.interventions, b.interventions),
          avoid: mergeArr(prev.avoid, b.avoid),
        });
      } else if (key) {
        map.set(key, b);
      }
    }
    return [...map.values()];
  };

  const mergeGoals = (existing, incoming) => {
    const titles = new Set((existing || []).map(g => g.title && g.title.toLowerCase()));
    const newGoals = (incoming || []).filter(g => g.title && !titles.has(g.title.toLowerCase()));
    return [...(existing || []), ...newGoals];
  };

  const existing = await base44.entities.ClientProfile.filter({ child_id: doc.child_id }).catch(() => []);

  if (existing.length > 0) {
    const profile = existing[0];
    await base44.entities.ClientProfile.update(profile.id, {
      diagnoses: mergeArr(profile.diagnoses, result.diagnoses),
      goals: mergeGoals(profile.goals, result.goals),
      behaviors: mergeBehaviors(profile.behaviors, result.behaviors),
      triggers: mergeArr(profile.triggers, result.triggers),
      reinforcers: mergeArr(profile.reinforcers, result.reinforcers),
      safety_procedures: mergeArr(profile.safety_procedures, result.safety_procedures),
      crisis_plan: mergeArr(profile.crisis_plan, result.crisis_plan),
      source_doc_ids: mergeArr(profile.source_doc_ids, [doc.id]),
    }).catch(() => {});
  } else {
    await base44.entities.ClientProfile.create({
      child_id: doc.child_id,
      clinician_id: clinicianId,
      diagnoses: result.diagnoses || [],
      goals: result.goals || [],
      behaviors: result.behaviors || [],
      triggers: result.triggers || [],
      reinforcers: result.reinforcers || [],
      safety_procedures: result.safety_procedures || [],
      crisis_plan: result.crisis_plan || [],
      source_doc_ids: [doc.id],
    }).catch(() => {});
  }
  return extractedGoals;
}

// Full AI scan: extracts intervention plans, behavior plans, profile knowledge base,
// and auto-creates inferred goals/milestones. Runs in background — doesn't block UI.
export async function scanDocumentInBackground(doc, clinicianId) {
  await base44.entities.Document.update(doc.id, { scan_status: "scanning" }).catch(() => {});

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: "You are a behavioral intervention specialist. Read this clinical document and extract ALL structured behavioral information concisely. Document: " + doc.title + " (" + (doc.category || "").replace(/_/g, " ") + "). Extract a primary intervention plan and all behavior plans mentioned. Be brief but complete. Only extract information that is explicitly present in the document.",
      file_urls: [doc.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          behavior_category: {
            type: "string",
            enum: ["tantrum_meltdown", "aggression", "anxiety_episode", "task_refusal",
                   "bedtime_refusal", "school_refusal", "transition_difficulty",
                   "emotional_dysregulation", "other"]
          },
          description: { type: "string" },
          immediate_steps: { type: "string" },
          deescalation_steps: { type: "string" },
          reinforcement_steps: { type: "string" },
          prevention_tips: { type: "string" },
          things_to_avoid: { type: "string" },
          emergency_instructions: { type: "string" },
          behavior_plans: {
            type: "array",
            items: {
              type: "object",
              properties: {
                behavior_name: { type: "string" },
                behavior_description: { type: "string" },
                behavior_function: { type: "string" },
                common_triggers: { type: "string" },
                severity_level: { type: "string", enum: ["low", "moderate", "high", "crisis"] },
                strategy_title: { type: "string" },
                strategy_steps: { type: "string" },
                reinforcement_method: { type: "string" },
                deescalation_steps: { type: "string" },
                avoid_actions: { type: "string" },
              },
              required: ["behavior_name"]
            }
          }
        },
        required: ["title", "behavior_category"]
      }
    });

    const existingPlans = await base44.entities.InterventionPlan.filter({
      source_document_id: doc.id
    }).catch(() => []);

    if (existingPlans.length === 0 && result.immediate_steps) {
      await base44.entities.InterventionPlan.create({
        child_id: doc.child_id,
        clinician_id: clinicianId,
        title: result.title || doc.title,
        behavior_category: result.behavior_category || "other",
        description: result.description || "",
        immediate_steps: result.immediate_steps || "",
        deescalation_steps: result.deescalation_steps || "",
        reinforcement_steps: result.reinforcement_steps || "",
        prevention_tips: result.prevention_tips || "",
        things_to_avoid: result.things_to_avoid || "",
        emergency_instructions: result.emergency_instructions || "",
        source_document_id: doc.id,
        is_active: true,
      });
    }

    if (result.behavior_plans && result.behavior_plans.length > 0) {
      const existingBP = await base44.entities.BehaviorPlan.filter({
        source_document_id: doc.id
      }).catch(() => []);

      if (existingBP.length === 0) {
        await Promise.all(result.behavior_plans.map(bp =>
          base44.entities.BehaviorPlan.create({
            child_id: doc.child_id,
            behavior_name: bp.behavior_name,
            behavior_description: bp.behavior_description || "",
            behavior_function: bp.behavior_function || "",
            common_triggers: bp.common_triggers || "",
            severity_level: bp.severity_level || "moderate",
            strategy_title: bp.strategy_title || "",
            strategy_steps: bp.strategy_steps || "",
            reinforcement_method: bp.reinforcement_method || "",
            deescalation_steps: bp.deescalation_steps || "",
            avoid_actions: bp.avoid_actions || "",
            created_by: clinicianId,
            source_document_id: doc.id,
          }).catch(() => {})
        ));
      }
    }

    await base44.entities.Document.update(doc.id, { scan_status: "done" }).catch(() => {});

    // Build/update the rich ClientProfile knowledge base (powers Help Now + AI)
    const extractedGoals = await buildClientProfile(doc, clinicianId).catch(() => null);

    // Sync extracted + inferred goals into RewardToken (Goals & Milestones)
    if (extractedGoals && extractedGoals.length > 0) {
      const existingGoals = await base44.entities.RewardToken.filter({ child_id: doc.child_id }).catch(() => []);
      const existingTitles = new Set(existingGoals.map(g => (g.goal_title || g.reward_description || "").toLowerCase()));
      for (const goal of extractedGoals) {
        if (goal.title && !existingTitles.has(goal.title.toLowerCase())) {
          await base44.entities.RewardToken.create({
            child_id: doc.child_id,
            clinician_id: clinicianId,
            goal_title: goal.title,
            goal_description: goal.description || "",
            progress: 0,
            target: 10,
            source: "document",
            created_by_clinician: true,
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    await base44.entities.Document.update(doc.id, { scan_status: "error" }).catch(() => {});
    throw e;
  }
}