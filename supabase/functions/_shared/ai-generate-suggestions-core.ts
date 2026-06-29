import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { AI_PROMPT_VERSION } from "./ai-prompts/v1/generate-plan.ts";
import {
  buildGenerateCalendarUserPrompt,
  GENERATE_CALENDAR_SYSTEM_PROMPT,
} from "./ai-prompts/v1/generate-calendar.ts";
import {
  buildGenerateNotificationsUserPrompt,
  GENERATE_NOTIFICATIONS_SYSTEM_PROMPT,
} from "./ai-prompts/v1/generate-notifications.ts";
import {
  buildGenerateOffersUserPrompt,
  GENERATE_OFFERS_SYSTEM_PROMPT,
} from "./ai-prompts/v1/generate-offers.ts";
import {
  calendarRowsFromGeneration,
  parseCalendarGenerationResponse,
  type CalendarGenerationResult,
} from "./ai-calendar-schema.ts";
import {
  parseNotificationsGenerationResponse,
  suggestionsFromNotifications,
  type NotificationsGenerationResult,
} from "./ai-notifications-schema.ts";
import {
  parseOffersGenerationResponse,
  suggestionsFromOffers,
  type OffersGenerationResult,
} from "./ai-offers-schema.ts";
import {
  assertGenerationAllowed,
  getGenerationQuotaStatus,
  markStarterTrialUsedIfNeeded,
} from "./ai-quota-core.ts";
import { runOpenAiJsonWithRetry } from "./ai-openai-json.ts";
import { toUserGenerationError } from "./ai-schemas/generation-errors.ts";
import { createAiUsageLogger } from "./ai-usage-log.ts";
import {
  parseRewardsGenerationResponse,
  type RewardsGenerationResult,
} from "./ai-rewards-schema.ts";
import {
  buildGenerateRewardsUserPrompt,
  GENERATE_REWARDS_SYSTEM_PROMPT,
} from "./ai-prompts/v1/generate-rewards.ts";
import {
  profileInputToRow,
  rowToProfileInput,
  validateRestaurantProfileInput,
} from "./ai-restaurant-profile-schema.ts";
import {
  fetchAiCustomerInsights,
  type AiCustomerInsights,
} from "./ai-customer-insights.ts";

const SUGGESTIONS_MODEL = Deno.env.get("AI_MODEL_SUGGESTIONS") || "gpt-4o-mini";

type GenerationContext = {
  menuUpload: { id: string; extracted_json: unknown };
  profileRow: { id: string };
  profile: ReturnType<typeof rowToProfileInput>;
  loyaltyProgram: Record<string, unknown>;
  customerInsights: AiCustomerInsights | null;
};

async function loadGenerationContext(
  userClient: SupabaseClient,
  businessId: string,
  menuUploadId?: string,
): Promise<GenerationContext> {
  let menuUpload;
  let menuError;

  if (menuUploadId) {
    ({ data: menuUpload, error: menuError } = await userClient
      .from("ai_menu_uploads")
      .select("id, extracted_json, status")
      .eq("business_id", businessId)
      .eq("id", menuUploadId)
      .eq("status", "extracted")
      .maybeSingle());
  } else {
    ({ data: menuUpload, error: menuError } = await userClient
      .from("ai_menu_uploads")
      .select("id, extracted_json, status")
      .eq("business_id", businessId)
      .eq("status", "extracted")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle());
  }

  if (menuError) throw new Error(menuError.message);
  if (!menuUpload?.extracted_json) {
    throw new Error("Aucun menu extrait — uploadez et extrayez un menu d'abord");
  }

  const { data: profileRow, error: profileError } = await userClient
    .from("ai_restaurant_profiles")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profileRow) {
    throw new Error("Complétez le questionnaire profil avant de générer");
  }

  const profile = rowToProfileInput(profileRow);
  const profileValidation = validateRestaurantProfileInput(profile);
  if (profileValidation) throw new Error(profileValidation);

  const { data: loyaltyProgram, error: programError } = await userClient
    .from("loyalty_programs")
    .select("id, type, reward_label, reward_threshold, points_per_euro, stamps_required")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .maybeSingle();

  if (programError) throw new Error(programError.message);
  const resolvedLoyaltyProgram = loyaltyProgram ?? buildDefaultLoyaltyProgramForGeneration();

  const customerInsights = await fetchAiCustomerInsights(userClient, businessId);

  return { menuUpload, profileRow, profile, loyaltyProgram: resolvedLoyaltyProgram, customerInsights };
}

function buildDefaultLoyaltyProgramForGeneration() {
  return {
    id: null,
    type: "points",
    reward_label: "Récompense offerte",
    reward_threshold: 100,
    points_per_euro: 1,
    stamps_required: 10,
  };
}

/** PostgREST remplit les colonnes absentes avec null sur un insert batch — pas le DEFAULT SQL. */
function ensureSuggestionInsertRow(row: Record<string, unknown>) {
  return {
    ...row,
    target_segment: row.target_segment ?? "all",
    margin_risk: row.margin_risk ?? "medium",
    status: row.status ?? "pending",
  };
}

function suggestionsFromRewards(
  businessId: string,
  batchId: string,
  programType: "points" | "stamps",
  generated: RewardsGenerationResult,
) {
  const rewardRows = generated.rewards.map((reward) => ({
    business_id: businessId,
    batch_id: batchId,
    suggestion_type: "reward",
    title: reward.title,
    description: reward.description,
    objective: reward.objective,
    customer_message: reward.description,
    recommended_threshold: reward.recommended_threshold,
    margin_risk: reward.margin_risk,
    explanation: reward.explanation,
    target_segment: "all",
    status: "pending",
  }));

  const thresholdRows = generated.threshold_options.map((option) => ({
    business_id: businessId,
    batch_id: batchId,
    suggestion_type: "threshold",
    title: programType === "stamps"
      ? `${option.threshold} tampons recommandés`
      : `${option.threshold} points recommandés`,
    description: option.rationale,
    objective: "frequence",
    recommended_threshold: option.threshold,
    margin_risk: "medium",
    explanation: option.rationale,
    target_segment: "all",
    status: "pending",
  }));

  return [...rewardRows, ...thresholdRows];
}

async function failGenerationBatch(
  admin: SupabaseClient,
  batchId: string,
  error: unknown,
): Promise<never> {
  const message = toUserGenerationError(error);
  await admin
    .from("ai_suggestion_batches")
    .update({ status: "failed", error_message: message })
    .eq("id", batchId);
  throw new Error(message);
}

async function persistGenerationBatch<T>(params: {
  admin: SupabaseClient;
  businessId: string;
  userId: string;
  quotaPlan: string;
  batchId: string;
  generated: T;
  suggestionRows: Record<string, unknown>[];
  modelUsed: string;
}) {
  const rows = params.suggestionRows.map(ensureSuggestionInsertRow);
  const { data: insertedSuggestions, error: insertError } = await params.admin
    .from("ai_suggestions")
    .insert(rows)
    .select();

  if (insertError) throw new Error(insertError.message);

  const { data: completedBatch, error: updateError } = await params.admin
    .from("ai_suggestion_batches")
    .update({
      status: "completed",
      model_used: params.modelUsed,
      raw_output: params.generated,
      error_message: null,
    })
    .eq("id", params.batchId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  await markStarterTrialUsedIfNeeded(params.admin, params.businessId, params.quotaPlan);

  return {
    batch: completedBatch,
    suggestions: insertedSuggestions ?? [],
    generated: params.generated,
  };
}

async function persistCalendarGenerationBatch(params: {
  admin: SupabaseClient;
  businessId: string;
  userId: string;
  quotaPlan: string;
  batchId: string;
  generated: CalendarGenerationResult;
  calendarRows: Record<string, unknown>[];
  modelUsed: string;
}) {
  const { data: insertedItems, error: insertError } = await params.admin
    .from("ai_marketing_calendar_items")
    .insert(params.calendarRows)
    .select();

  if (insertError) throw new Error(insertError.message);

  const { data: completedBatch, error: updateError } = await params.admin
    .from("ai_suggestion_batches")
    .update({
      status: "completed",
      model_used: params.modelUsed,
      raw_output: params.generated,
      error_message: null,
    })
    .eq("id", params.batchId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  await markStarterTrialUsedIfNeeded(params.admin, params.businessId, params.quotaPlan);

  return {
    batch: completedBatch,
    calendarItems: insertedItems ?? [],
    generated: params.generated,
  };
}

async function persistFullPlanBatch(params: {
  admin: SupabaseClient;
  businessId: string;
  userId: string;
  quotaPlan: string;
  batchId: string;
  generated: {
    rewards: RewardsGenerationResult;
    offers: OffersGenerationResult;
    notifications: NotificationsGenerationResult;
    calendar: CalendarGenerationResult;
  };
  suggestionRows: Record<string, unknown>[];
  calendarRows: Record<string, unknown>[];
  modelUsed: string;
}) {
  if (params.suggestionRows.length) {
    const rows = params.suggestionRows.map(ensureSuggestionInsertRow);
    const { error: insertSuggestionsError } = await params.admin
      .from("ai_suggestions")
      .insert(rows);
    if (insertSuggestionsError) throw new Error(insertSuggestionsError.message);
  }

  if (params.calendarRows.length) {
    const { error: insertCalendarError } = await params.admin
      .from("ai_marketing_calendar_items")
      .insert(params.calendarRows);
    if (insertCalendarError) throw new Error(insertCalendarError.message);
  }

  const { data: completedBatch, error: updateError } = await params.admin
    .from("ai_suggestion_batches")
    .update({
      status: "completed",
      model_used: params.modelUsed,
      raw_output: params.generated,
      error_message: null,
    })
    .eq("id", params.batchId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  await markStarterTrialUsedIfNeeded(params.admin, params.businessId, params.quotaPlan);

  const { data: suggestions } = await params.admin
    .from("ai_suggestions")
    .select("*")
    .eq("batch_id", params.batchId);

  const { data: calendarItems } = await params.admin
    .from("ai_marketing_calendar_items")
    .select("*")
    .eq("batch_id", params.batchId);

  return {
    batch: completedBatch,
    suggestions: suggestions ?? [],
    calendarItems: calendarItems ?? [],
    generated: params.generated,
  };
}

async function createProcessingBatch(
  admin: SupabaseClient,
  params: {
    businessId: string;
    userId: string;
    batchType: string;
    context: GenerationContext;
  },
) {
  const rawInput = {
    menu_upload_id: params.context.menuUpload.id,
    profile_id: params.context.profileRow.id,
    loyalty_program_id: params.context.loyaltyProgram.id,
    profile: profileInputToRow(params.businessId, params.context.profile),
    menu: params.context.menuUpload.extracted_json,
    loyalty_program: params.context.loyaltyProgram,
  };

  const { data: batch, error } = await admin
    .from("ai_suggestion_batches")
    .insert({
      business_id: params.businessId,
      menu_upload_id: params.context.menuUpload.id,
      profile_id: params.context.profileRow.id,
      type: params.batchType,
      status: "processing",
      prompt_version: Deno.env.get("AI_PROMPT_VERSION") || AI_PROMPT_VERSION,
      raw_input: rawInput,
      created_by: params.userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return batch;
}

function createBatchUsageLogger(
  admin: SupabaseClient,
  businessId: string,
  userId: string,
  batchId: string,
) {
  return createAiUsageLogger(admin, {
    business_id: businessId,
    user_id: userId,
    action: "generate_batch",
    batch_id: batchId,
  });
}

export async function generateRewardSuggestions(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  businessId: string,
  userId: string,
  menuUploadId?: string,
) {
  const quota = await assertGenerationAllowed(admin, businessId);

  const context = await loadGenerationContext(userClient, businessId, menuUploadId);
  const programType = context.loyaltyProgram.type === "stamps" ? "stamps" : "points";
  const batch = await createProcessingBatch(admin, {
    businessId,
    userId,
    batchType: "rewards_only",
    context,
  });

  try {
    const aiResult = await runOpenAiJsonWithRetry({
      model: SUGGESTIONS_MODEL,
      systemPrompt: GENERATE_REWARDS_SYSTEM_PROMPT,
      userPrompt: buildGenerateRewardsUserPrompt({
        menuJson: context.menuUpload.extracted_json,
        profile: profileInputToRow(businessId, context.profile),
        loyaltyProgram: context.loyaltyProgram,
        customerInsights: context.customerInsights,
      }),
      parse: (content) => parseRewardsGenerationResponse(content, programType),
      onProviderCall: createBatchUsageLogger(admin, businessId, userId, batch.id),
    });

    const generated = aiResult.parsed;
    const suggestionRows = suggestionsFromRewards(businessId, batch.id, programType, generated);

    return await persistGenerationBatch({
      admin,
      businessId,
      userId,
      quotaPlan: quota.plan,
      batchId: batch.id,
      generated,
      suggestionRows,
      modelUsed: aiResult.model,
    });
  } catch (error) {
    return await failGenerationBatch(admin, batch.id, error);
  }
}

export async function generateOfferSuggestions(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  businessId: string,
  userId: string,
  menuUploadId?: string,
) {
  const quota = await assertGenerationAllowed(admin, businessId);

  const context = await loadGenerationContext(userClient, businessId, menuUploadId);
  const programType = context.loyaltyProgram.type === "stamps" ? "stamps" : "points";
  const batch = await createProcessingBatch(admin, {
    businessId,
    userId,
    batchType: "offers_only",
    context,
  });

  try {
    const aiResult = await runOpenAiJsonWithRetry({
      model: SUGGESTIONS_MODEL,
      systemPrompt: GENERATE_OFFERS_SYSTEM_PROMPT,
      userPrompt: buildGenerateOffersUserPrompt({
        menuJson: context.menuUpload.extracted_json,
        profile: profileInputToRow(businessId, context.profile),
        loyaltyProgram: context.loyaltyProgram,
        customerInsights: context.customerInsights,
      }),
      parse: (content) => parseOffersGenerationResponse(content, programType),
      onProviderCall: createBatchUsageLogger(admin, businessId, userId, batch.id),
    });

    const generated = aiResult.parsed;
    const suggestionRows = suggestionsFromOffers(businessId, batch.id, generated);

    return await persistGenerationBatch({
      admin,
      businessId,
      userId,
      quotaPlan: quota.plan,
      batchId: batch.id,
      generated,
      suggestionRows,
      modelUsed: aiResult.model,
    });
  } catch (error) {
    return await failGenerationBatch(admin, batch.id, error);
  }
}

export async function generateNotificationSuggestions(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  businessId: string,
  userId: string,
  menuUploadId?: string,
) {
  const quota = await assertGenerationAllowed(admin, businessId);

  const context = await loadGenerationContext(userClient, businessId, menuUploadId);
  const programType = context.loyaltyProgram.type === "stamps" ? "stamps" : "points";
  const batch = await createProcessingBatch(admin, {
    businessId,
    userId,
    batchType: "notifications_only",
    context,
  });

  try {
    const aiResult = await runOpenAiJsonWithRetry({
      model: SUGGESTIONS_MODEL,
      systemPrompt: GENERATE_NOTIFICATIONS_SYSTEM_PROMPT,
      userPrompt: buildGenerateNotificationsUserPrompt({
        menuJson: context.menuUpload.extracted_json,
        profile: profileInputToRow(businessId, context.profile),
        loyaltyProgram: context.loyaltyProgram,
        customerInsights: context.customerInsights,
      }),
      parse: (content) => parseNotificationsGenerationResponse(content, programType),
      onProviderCall: createBatchUsageLogger(admin, businessId, userId, batch.id),
    });

    const generated = aiResult.parsed;
    const suggestionRows = suggestionsFromNotifications(businessId, batch.id, generated);

    return await persistGenerationBatch({
      admin,
      businessId,
      userId,
      quotaPlan: quota.plan,
      batchId: batch.id,
      generated,
      suggestionRows,
      modelUsed: aiResult.model,
    });
  } catch (error) {
    return await failGenerationBatch(admin, batch.id, error);
  }
}

export async function generateCalendarSuggestions(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  businessId: string,
  userId: string,
  menuUploadId?: string,
) {
  const quota = await assertGenerationAllowed(admin, businessId);

  const context = await loadGenerationContext(userClient, businessId, menuUploadId);
  const programType = context.loyaltyProgram.type === "stamps" ? "stamps" : "points";
  const startDate = new Date().toISOString().slice(0, 10);
  const batch = await createProcessingBatch(admin, {
    businessId,
    userId,
    batchType: "calendar_only",
    context,
  });

  try {
    const aiResult = await runOpenAiJsonWithRetry({
      model: SUGGESTIONS_MODEL,
      systemPrompt: GENERATE_CALENDAR_SYSTEM_PROMPT,
      userPrompt: buildGenerateCalendarUserPrompt({
        menuJson: context.menuUpload.extracted_json,
        profile: profileInputToRow(businessId, context.profile),
        loyaltyProgram: context.loyaltyProgram,
        startDate,
        customerInsights: context.customerInsights,
      }),
      parse: (content) => parseCalendarGenerationResponse(content, startDate, programType),
      onProviderCall: createBatchUsageLogger(admin, businessId, userId, batch.id),
    });

    const generated = aiResult.parsed;
    const calendarRows = calendarRowsFromGeneration(businessId, batch.id, generated);

    return await persistCalendarGenerationBatch({
      admin,
      businessId,
      userId,
      quotaPlan: quota.plan,
      batchId: batch.id,
      generated,
      calendarRows,
      modelUsed: aiResult.model,
    });
  } catch (error) {
    return await failGenerationBatch(admin, batch.id, error);
  }
}

export async function generateFullPlanSuggestions(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  businessId: string,
  userId: string,
  menuUploadId?: string,
) {
  const quota = await assertGenerationAllowed(admin, businessId);

  const context = await loadGenerationContext(userClient, businessId, menuUploadId);
  const programType = context.loyaltyProgram.type === "stamps" ? "stamps" : "points";
  const profileRow = profileInputToRow(businessId, context.profile);
  const startDate = new Date().toISOString().slice(0, 10);

  const batch = await createProcessingBatch(admin, {
    businessId,
    userId,
    batchType: "full_plan",
    context,
  });

  const logProviderCall = createBatchUsageLogger(admin, businessId, userId, batch.id);

  try {
    const promptContext = {
      menuJson: context.menuUpload.extracted_json,
      profile: profileRow,
      loyaltyProgram: context.loyaltyProgram,
      customerInsights: context.customerInsights,
    };

    const [rewardsResult, offersResult, notificationsResult, calendarResult] =
      await Promise.all([
        runOpenAiJsonWithRetry({
          model: SUGGESTIONS_MODEL,
          systemPrompt: GENERATE_REWARDS_SYSTEM_PROMPT,
          userPrompt: buildGenerateRewardsUserPrompt(promptContext),
          parse: (content) => parseRewardsGenerationResponse(content, programType),
          onProviderCall: logProviderCall,
        }),
        runOpenAiJsonWithRetry({
          model: SUGGESTIONS_MODEL,
          systemPrompt: GENERATE_OFFERS_SYSTEM_PROMPT,
          userPrompt: buildGenerateOffersUserPrompt(promptContext),
          parse: (content) => parseOffersGenerationResponse(content, programType),
          onProviderCall: logProviderCall,
        }),
        runOpenAiJsonWithRetry({
          model: SUGGESTIONS_MODEL,
          systemPrompt: GENERATE_NOTIFICATIONS_SYSTEM_PROMPT,
          userPrompt: buildGenerateNotificationsUserPrompt(promptContext),
          parse: (content) => parseNotificationsGenerationResponse(content, programType),
          onProviderCall: logProviderCall,
        }),
        runOpenAiJsonWithRetry({
          model: SUGGESTIONS_MODEL,
          systemPrompt: GENERATE_CALENDAR_SYSTEM_PROMPT,
          userPrompt: buildGenerateCalendarUserPrompt({
            ...promptContext,
            startDate,
          }),
          parse: (content) =>
            parseCalendarGenerationResponse(content, startDate, programType),
          onProviderCall: logProviderCall,
        }),
      ]);

    const rewards = rewardsResult.parsed;
    const offers = offersResult.parsed;
    const notifications = notificationsResult.parsed;
    const calendar = calendarResult.parsed;

    const suggestionRows = [
      ...suggestionsFromRewards(businessId, batch.id, programType, rewards),
      ...suggestionsFromOffers(businessId, batch.id, offers),
      ...suggestionsFromNotifications(businessId, batch.id, notifications),
    ];
    const calendarRows = calendarRowsFromGeneration(businessId, batch.id, calendar);

    return await persistFullPlanBatch({
      admin,
      businessId,
      userId,
      quotaPlan: quota.plan,
      batchId: batch.id,
      generated: { rewards, offers, notifications, calendar },
      suggestionRows,
      calendarRows,
      modelUsed: SUGGESTIONS_MODEL,
    });
  } catch (error) {
    return await failGenerationBatch(admin, batch.id, error);
  }
}

export async function getGenerationQuotaForBusiness(
  admin: SupabaseClient,
  businessId: string,
) {
  return getGenerationQuotaStatus(admin, businessId);
}
