const express = require("express");
const axios = require("axios");
const supabase = require("../lib/supabase");

const router = express.Router();
const GRAPH_VERSION = "v19.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const INSTAGRAM_GRAPH_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;
const DEFAULT_PUBLIC_REPLY =
  "Sent check the DM";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenFor(account) {
  return account?.page_access_token || account?.access_token;
}

function graphUrlFor(account) {
  return account?.auth_provider === "instagram" ? INSTAGRAM_GRAPH_URL : GRAPH_URL;
}

function tokensForInstagramProfile(account) {
  return [
    ["access_token", account?.access_token],
    ["page_access_token", account?.page_access_token],
  ].filter(([, token]) => Boolean(token));
}

function renderTemplate(text, context = {}) {
  return String(text || "").replaceAll(
    "{{first_name}}",
    context.firstName || "there"
  );
}

function parsePayload(payload) {
  const [action, automationId, interactionId] = String(payload || "").split(":");
  return { action, automationId, interactionId };
}

function automationMatchesComment(rule, commentText) {
  const raw = String(rule?.trigger_value || "").trim().toLowerCase();

  if (!raw || raw === "*" || raw === "any") {
    return true;
  }

  return raw
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .some((keyword) => commentText.includes(keyword));
}

function pickTextVariant(value, fallback) {
  const variants = String(value || "")
    .split("\n---\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (variants.length === 0) {
    return fallback;
  }

  return variants[Math.floor(Math.random() * variants.length)];
}

async function metaPost(path, account, body, label, accessTokenOverride = null) {
  const accessToken = accessTokenOverride || tokenFor(account);
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await axios.post(`${graphUrlFor(account)}/${path}`, body, {
        params: { access_token: accessToken },
        timeout: 15000,
      });
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const temporary = !status || status >= 500 || status === 429;

      console.error(
        `Meta API error during ${label} attempt ${attempt}:`,
        error.response?.data || error.message
      );

      if (!temporary || attempt === 3) break;
      await delay(500 * attempt);
    }
  }

  throw lastError;
}

async function metaGet(path, account, params = {}, label = "Meta GET") {
  const accessToken = tokenFor(account);

  try {
    return await axios.get(`${graphUrlFor(account)}/${path}`, {
      params: { ...params, access_token: accessToken },
      timeout: 15000,
    });
  } catch (error) {
    console.error(
      `Meta API error during ${label}:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function saveWebhookEvent({
  eventType,
  accountId,
  mediaId,
  commentId,
  payload,
  status = "received",
  message = null,
}) {
  const { data, error } = await supabase
    .from("webhook_events")
    .insert({
      event_type: eventType,
      account_id: accountId || null,
      media_id: mediaId || null,
      comment_id: commentId || null,
      raw_payload: payload,
      status,
      message,
      processed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Webhook event insert failed:", error.message);
  }

  return data;
}

async function saveAutomationEvent({
  interactionId,
  automationId,
  connectedAccountId,
  instagramSenderId,
  commentId,
  mediaId,
  eventType,
  direction,
  status = "sent",
  payload = {},
  errorMessage = null,
}) {
  await supabase.from("automation_events").insert({
    interaction_id: interactionId || null,
    automation_id: automationId || null,
    connected_account_id: connectedAccountId || null,
    instagram_sender_id: instagramSenderId || null,
    comment_id: commentId || null,
    media_id: mediaId || null,
    event_type: eventType,
    direction,
    status,
    payload,
    error_message: errorMessage,
  });
}

async function updateWebhookEvent(id, { status, message, accountId }) {
  if (!id) return;

  const updates = {
    status,
    message: message || null,
    processed_at: new Date().toISOString(),
  };

  if (accountId) updates.account_id = accountId;

  await supabase.from("webhook_events").update(updates).eq("id", id);
}

async function saveWebhookComment({ mediaId, value }) {
  const commentId = value?.id || value?.comment_id;
  if (!commentId || !value?.text) return;

  const { data: media } = await supabase
    .from("instagram_media")
    .select("account_id")
    .eq("id", mediaId)
    .maybeSingle();

  const row = {
    id: commentId,
    account_id: media?.account_id || null,
    media_id: mediaId,
    text: value.text,
    username: value.from?.username || null,
    timestamp: value.created_time
      ? new Date(value.created_time * 1000).toISOString()
      : new Date().toISOString(),
    raw_payload: value,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("instagram_comments")
    .select("id")
    .eq("id", row.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("instagram_comments").update(row).eq("id", row.id);
  } else {
    await supabase.from("instagram_comments").insert(row);
  }
}

async function getAutomationAccount(automation) {
  if (!automation?.user_email && !automation?.media_id) return null;

  if (!automation?.user_email && automation?.media_id) {
    const { data: mediaAccount, error: mediaAccountError } = await supabase
      .from("instagram_media")
      .select("account_id,instagram_accounts(id,auth_provider,instagram_user_id,instagram_account_id,page_id,facebook_page_id,page_access_token,access_token,username,instagram_username,profile_picture_url,user_email)")
      .eq("id", automation.media_id)
      .maybeSingle();

    if (mediaAccountError) throw mediaAccountError;
    if (mediaAccount?.instagram_accounts) return mediaAccount.instagram_accounts;
  }

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("id,auth_provider,instagram_user_id,instagram_account_id,page_id,facebook_page_id,page_access_token,access_token,username,instagram_username,profile_picture_url")
    .eq("user_email", automation.user_email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getAccountForMedia(mediaId) {
  if (!mediaId) return null;

  const { data, error } = await supabase
    .from("instagram_media")
    .select("account_id,instagram_accounts(id,user_email,auth_provider,instagram_user_id,instagram_account_id,page_id,facebook_page_id,page_access_token,access_token,username,instagram_username,profile_picture_url)")
    .eq("id", mediaId)
    .maybeSingle();

  if (error) throw error;
  if (data?.instagram_accounts) return data.instagram_accounts;
  if (data?.account_id) {
    const { data: mediaAccount, error: mediaAccountError } = await supabase
      .from("instagram_accounts")
      .select("id,user_email,auth_provider,instagram_user_id,instagram_account_id,page_id,facebook_page_id,page_access_token,access_token,username,instagram_username,profile_picture_url")
      .eq("id", data.account_id)
      .maybeSingle();

    if (mediaAccountError) throw mediaAccountError;
    if (mediaAccount) return mediaAccount;
  }

  const { data: accounts = [], error: accountsError } = await supabase
    .from("instagram_accounts")
    .select("id,user_email,auth_provider,instagram_user_id,instagram_account_id,page_id,facebook_page_id,page_access_token,access_token,username,instagram_username,profile_picture_url");

  if (accountsError) throw accountsError;

  for (const account of accounts) {
    if (!tokenFor(account)) continue;

    try {
      const response = await metaGet(
        mediaId,
        account,
        {
          fields:
            "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count",
        },
        "media lookup"
      );

      if (response.data?.id) {
        await supabase.from("instagram_media").upsert({
          id: response.data.id,
          account_id: account.id,
          caption: response.data.caption || null,
          media_type: response.data.media_type || null,
          media_url: response.data.media_url || null,
          thumbnail_url: response.data.thumbnail_url || null,
          timestamp: response.data.timestamp || null,
          permalink: response.data.permalink || null,
          like_count: response.data.like_count || null,
          comments_count: response.data.comments_count || null,
          updated_at: new Date().toISOString(),
        });

        console.log("✅ Synced missing webhook media:", {
          mediaId,
          accountId: account.id,
        });
        return account;
      }
    } catch {
      // Try the next connected account token.
    }
  }

  return null;
}

async function findMatchingAutomation({ mediaId, commentText }) {
  const { data: exactAutomations = [], error } = await supabase
    .from("automations")
    .select("*")
    .eq("media_id", mediaId)
    .eq("is_active", true);

  if (error) throw error;

  const exactMatch = exactAutomations.find((rule) =>
    automationMatchesComment(rule, commentText)
  );

  if (exactMatch) {
    return { automation: exactMatch, matchedBy: "media" };
  }

  const account = await getAccountForMedia(mediaId);

  if (!account?.user_email) {
    console.log("⚠️ Media is not synced to an account:", mediaId);
    const { data: wildcardAutomations = [], error: wildcardError } =
      await supabase
        .from("automations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (wildcardError) throw wildcardError;

    const wildcardMatch = wildcardAutomations.find((rule) => {
      const trigger = String(rule.trigger_value || "").trim().toLowerCase();
      return (trigger === "*" || trigger === "any") &&
        automationMatchesComment(rule, commentText);
    });

    if (wildcardMatch) {
      console.log("⚠️ Automation matched by unsynced media fallback:", {
        automationId: wildcardMatch.id,
        mediaId,
      });
      return { automation: wildcardMatch, matchedBy: "unsynced_media_fallback" };
    }

    return { automation: null, matchedBy: "none" };
  }

  const { data: accountAutomations = [], error: accountError } = await supabase
    .from("automations")
    .select("*")
    .eq("user_email", account.user_email)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (accountError) throw accountError;

  const fallbackMatch = accountAutomations.find((rule) => {
    const trigger = String(rule.trigger_value || "").trim();
    return (trigger === "*" || trigger.toLowerCase() === "any") &&
      automationMatchesComment(rule, commentText);
  });

  if (fallbackMatch) {
    console.log("⚠️ Automation matched by account fallback:", {
      automationId: fallbackMatch.id,
      mediaId,
      accountId: account.id,
    });
    return { automation: fallbackMatch, matchedBy: "account_fallback" };
  }

  return { automation: null, matchedBy: "none" };
}

async function findInteraction({ automationId, instagramSenderId, commentId }) {
  const { data = [] } = await supabase
    .from("automation_interactions")
    .select("*")
    .eq("automation_id", automationId);

  const byComment = data.find(
    (item) => commentId && item.comment_id === commentId
  );

  if (byComment) return byComment;

  return data.find(
    (item) =>
      instagramSenderId &&
      item.instagram_sender_id === instagramSenderId &&
      item.resource_delivery_status === "delivered"
  );
}

async function upsertInteraction(existing, updates) {
  const now = new Date().toISOString();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("automation_interactions")
      .update({ ...updates, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("automation_interactions")
    .insert({ ...updates, updated_at: now })
    .select()
    .single();

  if (error) {
    if (
      error.code === "23505" &&
      updates.automation_id &&
      updates.instagram_sender_id
    ) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("automation_interactions")
        .select("*")
        .eq("automation_id", updates.automation_id)
        .eq("instagram_sender_id", updates.instagram_sender_id)
        .maybeSingle();

      if (duplicateError) throw duplicateError;

      if (duplicate?.id) {
        const { data: recovered, error: recoveredError } = await supabase
          .from("automation_interactions")
          .update({ ...updates, updated_at: now })
          .eq("id", duplicate.id)
          .select()
          .single();

        if (recoveredError) throw recoveredError;
        return recovered;
      }
    }

    throw error;
  }

  return data;
}

async function sendPublicReply({ account, commentId, message }) {
  await metaPost(
    `${commentId}/replies`,
    account,
    { message },
    "public comment reply"
  );
}

async function sendInstagramMessage({ account, recipient, text, buttons = [] }) {
  const pageId = account.page_id || account.facebook_page_id;
  const messageTargets = [
    {
      ownerId: account.instagram_user_id || account.instagram_account_id,
      tokens: tokensForInstagramProfile(account),
    },
    {
      ownerId: pageId,
      tokens: [["page_access_token", account?.page_access_token]].filter(
        ([, token]) => Boolean(token)
      ),
    },
  ].filter((target) => target.ownerId && target.tokens.length);
  const message = buttons.length
    ? {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text,
            buttons,
          },
        },
      }
    : { text };

  let lastError;

  const seenAttempts = new Set();

  for (const { ownerId, tokens } of messageTargets) {
    for (const [tokenLabel, accessToken] of tokens) {
      const attemptKey = `${ownerId}:${accessToken}`;
      if (seenAttempts.has(attemptKey)) continue;
      seenAttempts.add(attemptKey);

      try {
        await metaPost(
          `${ownerId}/messages`,
          account,
          {
            recipient,
            message,
            messaging_type: "RESPONSE",
          },
          `Instagram message via ${ownerId}/${tokenLabel}`,
          accessToken
        );
        return { message_owner_id: ownerId, token: tokenLabel };
      } catch (error) {
        lastError = error;
        console.warn(
          "⚠️ Instagram message send failed:",
          { ownerId, token: tokenLabel },
          error.response?.data || error.message
        );
      }
    }
  }

  throw lastError;
}

async function sendCommentPrivateReply({ account, commentId, text }) {
  await metaPost(
    `${commentId}/private_replies`,
    account,
    { message: text },
    "Instagram comment private reply"
  );
}

async function sendOpeningDirectMessage({ account, commentId, text, buttons = [] }) {
  try {
    const sendResult = await sendInstagramMessage({
      account,
      recipient: { comment_id: commentId },
      text,
      buttons,
    });

    return {
      method: buttons.length
        ? "messages_comment_id_button_template"
        : "messages_comment_id_plain_text",
      ...sendResult,
    };
  } catch (messageError) {
    console.warn(
      "⚠️ Instagram message failed; trying private reply without buttons:",
      messageError.response?.data || messageError.message
    );

    await sendCommentPrivateReply({ account, commentId, text });

    return { method: "private_replies_plain_text_fallback" };
  }
}

function buildOpeningMessageText({ automation, value }) {
  return renderTemplate(
    automation.opening_dm_message ||
      "Hey {{first_name}} 👋\nThanks for commenting!\nPlease tap the button below to get the details.",
    {
      firstName: value.from?.username,
    }
  );
}

async function checkFollowStatus({ account, senderId }) {
  console.log("🔎 Follow check requested", {
    accountId: account?.id,
    senderId,
  });

  if (!senderId) {
    console.log("ℹ️ Follow check result: missing sender id");
    return {
      supported: false,
      status: "unknown",
      reason: "missing_sender_id",
    };
  }

  const tokens = tokensForInstagramProfile(account);

  if (!tokens.length) {
    console.log("ℹ️ Follow check result: no connected account token");
    return {
      supported: false,
      status: "unknown",
      reason: "missing_access_token",
    };
  }

  let lastErrorMessage = null;

  const profileUrls = [
    ["facebook_graph", `${GRAPH_URL}/${senderId}`],
    ["instagram_graph", `https://graph.instagram.com/${GRAPH_VERSION}/${senderId}`],
  ];

  for (const [graphLabel, profileUrl] of profileUrls) {
    for (const [tokenLabel, accessToken] of tokens) {
      try {
        const { data } = await axios.get(profileUrl, {
          params: {
            fields:
              "id,username,is_user_follow_business,is_business_follow_user",
            access_token: accessToken,
          },
          timeout: 15000,
        });

        const followsBusiness = data?.is_user_follow_business;
        const status =
          followsBusiness === true
            ? "following"
            : followsBusiness === false
              ? "not_following"
              : "unknown";

        console.log("✅ Follow check result:", {
          status,
          graph: graphLabel,
          token: tokenLabel,
          username: data?.username,
        });

        return {
          supported: true,
          status,
          profile: {
            id: data?.id,
            username: data?.username,
            is_user_follow_business: followsBusiness,
            is_business_follow_user: data?.is_business_follow_user,
          },
        };
      } catch (error) {
        lastErrorMessage =
          error.response?.data?.error?.message ||
          error.message ||
          "Instagram profile lookup failed";

        console.error(
          `Meta API error during follow check with ${graphLabel}/${tokenLabel}:`,
          error.response?.data || error.message
        );
      }
    }
  }

  console.log("ℹ️ Follow check result: unavailable", {
    reason: lastErrorMessage,
  });

  return {
    supported: false,
    status: "unknown",
    reason: lastErrorMessage,
  };
}

function resourceButtons(automation) {
  if (!automation.resource_url) return [];

  return [
    {
      type: "web_url",
      url: automation.resource_url,
      title: automation.resource_button_label || "Open Details",
    },
  ];
}

async function hasSentResource(interactionId) {
  if (!interactionId) return false;

  const { data } = await supabase
    .from("automation_events")
    .select("id")
    .eq("interaction_id", interactionId)
    .eq("event_type", "resource_sent")
    .eq("status", "sent")
    .maybeSingle();

  return Boolean(data);
}

function alreadyDeliveredMessage(automation) {
  return (
    automation.already_delivered_message ||
    "I already sent you the details for this automation. Please check your previous messages."
  );
}

async function sendAlreadyDeliveredNotice({ account, automation, interaction }) {
  const text = alreadyDeliveredMessage(automation);
  let status = "sent";
  let errorMessage = null;
  let payload = { method: "messages_sender_id_plain_text" };

  try {
    const result = await sendInstagramMessage({
      account,
      recipient: { id: interaction.instagram_sender_id },
      text,
    });
    payload = { ...payload, ...result };
  } catch (error) {
    errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      "Already-delivered notice DM failed";

    if (!interaction.comment_id) {
      status = "failed";
      console.warn("⚠️ Already-delivered notice failed:", errorMessage);
    } else {
      try {
        await sendCommentPrivateReply({
          account,
          commentId: interaction.comment_id,
          text,
        });
        status = "sent";
        errorMessage = null;
        payload = { method: "private_replies_plain_text_fallback" };
      } catch (fallbackError) {
        status = "failed";
        errorMessage =
          fallbackError.response?.data?.error?.message ||
          fallbackError.message ||
          errorMessage;
        console.warn(
          "⚠️ Already-delivered notice fallback failed:",
          fallbackError.response?.data || fallbackError.message
        );
      }
    }
  }

  await saveAutomationEvent({
    interactionId: interaction.id,
    automationId: automation.id,
    connectedAccountId: account.id,
    instagramSenderId: interaction.instagram_sender_id,
    commentId: interaction.comment_id,
    mediaId: interaction.media_id,
    eventType:
      status === "sent"
        ? "resource_duplicate_notice_sent"
        : "resource_duplicate_notice_failed",
    direction: "outbound",
    status,
    payload,
    errorMessage,
  });

  return upsertInteraction(interaction, {
    current_step:
      status === "sent"
        ? "resource_already_delivered_notice_sent"
        : "resource_already_delivered_notice_failed",
  });
}

async function sendResource({ account, automation, interaction }) {
  if (interaction.resource_delivered_at) {
    const { data: sentEvent } = await supabase
      .from("automation_events")
      .select("id")
      .eq("interaction_id", interaction.id)
      .eq("event_type", "resource_sent")
      .eq("status", "sent")
      .maybeSingle();

    if (sentEvent) {
      console.log(
        "↩️ Resource already delivered; sending duplicate notice instead"
      );
      return sendAlreadyDeliveredNotice({ account, automation, interaction });
    }

    console.log(
      "⚠️ Resource was marked delivered without a sent event; sending now"
    );
  }

  const text = automation.success_message || automation.message;
  try {
    await sendInstagramMessage({
      account,
      recipient: { id: interaction.instagram_sender_id },
      text,
      buttons: resourceButtons(automation),
    });
  } catch (error) {
    if (!interaction.comment_id) throw error;

    const fallbackText = [text, automation.resource_url]
      .filter(Boolean)
      .join("\n\n");

    console.warn(
      "⚠️ Resource DM failed; trying comment private reply fallback:",
      error.response?.data || error.message
    );
    await sendCommentPrivateReply({
      account,
      commentId: interaction.comment_id,
      text: fallbackText,
    });
  }

  console.log("✅ Resource sent");
  await saveAutomationEvent({
    interactionId: interaction.id,
    automationId: automation.id,
    connectedAccountId: account.id,
    instagramSenderId: interaction.instagram_sender_id,
    commentId: interaction.comment_id,
    mediaId: interaction.media_id,
    eventType: "resource_sent",
    direction: "outbound",
    payload: { resource_url: automation.resource_url || null },
  });

  return upsertInteraction(interaction, {
    current_step: "resource_delivered",
    resource_delivery_status: "delivered",
    resource_delivered_at: new Date().toISOString(),
  });
}

async function sendFollowPrompt({ account, automation, interaction }) {
  if (
    interaction.resource_delivered_at ||
    interaction.resource_delivery_status === "delivered" ||
    (await hasSentResource(interaction.id))
  ) {
    console.log("↩️ Resource already sent; skipping follow prompt");
    return interaction;
  }

  const text =
    automation.not_following_message ||
    "Oops! It looks like you’re not following us yet 👀\n\nThis resource is available only to our followers.\n\nPlease visit our profile, follow us, and then tap ‘I’m Following’ below.";
  const buttons = [
      {
        type: "web_url",
        url: `https://www.instagram.com/${account.username || ""}`,
        title: automation.visit_profile_button_text || "Visit Profile",
      },
      {
        type: "postback",
        title: automation.confirm_follow_button_text || "I’m Following ✓",
        payload: `CONFIRM_FOLLOW:${automation.id}:${interaction.id}`,
      },
    ];

  try {
    await sendInstagramMessage({
      account,
      recipient: { id: interaction.instagram_sender_id },
      text,
      buttons,
    });
  } catch (error) {
    if (!interaction.comment_id) throw error;

    console.warn(
      "⚠️ Follow prompt DM failed; trying comment private reply fallback:",
      error.response?.data || error.message
    );
    await sendCommentPrivateReply({
      account,
      commentId: interaction.comment_id,
      text,
    });
  }

  await saveAutomationEvent({
    interactionId: interaction.id,
    automationId: automation.id,
    connectedAccountId: account.id,
    instagramSenderId: interaction.instagram_sender_id,
    commentId: interaction.comment_id,
    mediaId: interaction.media_id,
    eventType: "follow_prompt_sent",
    direction: "outbound",
  });

  return upsertInteraction(interaction, {
    current_step: "waiting_for_follow_confirmation",
    follow_status: "unknown",
  });
}

async function processComment({ body, entry, change, value }) {
  const eventType = change?.field || "comments";
  const commentId = value?.id || value?.comment_id;
  const mediaId = value?.media?.id || value?.media_id;
  const senderId = value?.from?.id || value?.sender_id;

  console.log("💬 Comment received:", {
    mediaId,
    commentId,
    senderId,
    text: value?.text,
  });

  if (!commentId || !mediaId || !value?.text) {
    await saveWebhookEvent({
      eventType,
      payload: body,
      status: "ignored",
      message: "Missing comment id, media id, or text",
    });
    return;
  }

  if (value.parent_id) {
    await saveWebhookEvent({
      eventType,
      mediaId,
      commentId,
      payload: body,
      status: "ignored",
      message: "Comment is a reply",
    });
    return;
  }

  const webhookEvent = await saveWebhookEvent({
    eventType,
    mediaId,
    commentId,
    payload: body,
  });
  await saveWebhookComment({ mediaId, value });

  const commentText = String(value.text).toLowerCase();
  const { automation, matchedBy } = await findMatchingAutomation({
    mediaId,
    commentText,
  });

  if (!automation) {
    await updateWebhookEvent(webhookEvent?.id, {
      status: "skipped",
      message: `No active automation matched "${value.text}" for media ${mediaId}`,
    });
    return;
  }

  console.log("⚡ Automation matched:", {
    automationId: automation.id,
    matchedBy,
  });
  const account =
    (await getAccountForMedia(mediaId)) || (await getAutomationAccount(automation));

  if (!account) {
    await updateWebhookEvent(webhookEvent?.id, {
      status: "skipped",
      message: "No connected account found for automation",
    });
    return;
  }

  await updateWebhookEvent(webhookEvent?.id, {
    status: "matched",
    accountId: account.id,
    message: `Matched automation ${automation.id}`,
  });

  const accountUsername = account.username || account.instagram_username;
  if (value.from?.username === accountUsername) {
    await updateWebhookEvent(webhookEvent?.id, {
      status: "ignored",
      message: "Comment is from the connected account",
    });
    return;
  }

  let interaction = await findInteraction({
    automationId: automation.id,
    instagramSenderId: senderId,
    commentId,
  });

  const sameUserNewComment =
    interaction?.comment_id && interaction.comment_id !== commentId;

  interaction = await upsertInteraction(interaction, {
    automation_id: automation.id,
    connected_account_id: account.id,
    instagram_sender_id: senderId,
    instagram_username: value.from?.username || null,
    comment_id: commentId,
    media_id: mediaId,
    current_step: sameUserNewComment
      ? "comment_received"
      : interaction?.current_step || "comment_received",
    follow_status: interaction?.follow_status || "unknown",
    resource_delivery_status:
      interaction?.resource_delivery_status || "not_delivered",
    public_reply_sent_at: sameUserNewComment
      ? null
      : interaction?.public_reply_sent_at || null,
    opening_dm_sent_at: sameUserNewComment
      ? null
      : interaction?.opening_dm_sent_at || null,
    raw_context: { entry_id: entry?.id, comment: value },
  });

  await saveAutomationEvent({
    interactionId: interaction.id,
    automationId: automation.id,
    connectedAccountId: account.id,
    instagramSenderId: senderId,
    commentId,
    mediaId,
    eventType: "comment_received",
    direction: "inbound",
    payload: value,
  });

  if (!interaction.public_reply_sent_at) {
    try {
      await sendPublicReply({
        account,
        commentId,
        message: pickTextVariant(automation.public_reply, DEFAULT_PUBLIC_REPLY),
      });
      console.log("✅ Public reply sent");
      await saveAutomationEvent({
        interactionId: interaction.id,
        automationId: automation.id,
        connectedAccountId: account.id,
        instagramSenderId: senderId,
        commentId,
        mediaId,
        eventType: "public_reply_sent",
        direction: "outbound",
      });
      interaction = await upsertInteraction(interaction, {
        public_reply_sent_at: new Date().toISOString(),
        current_step: "public_reply_sent",
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Public reply failed";

      await saveAutomationEvent({
        interactionId: interaction.id,
        automationId: automation.id,
        connectedAccountId: account.id,
        instagramSenderId: senderId,
        commentId,
        mediaId,
        eventType: "public_reply_failed",
        direction: "outbound",
        status: "failed",
        errorMessage,
      });
      await upsertInteraction(interaction, {
        current_step: "public_reply_failed",
        raw_context: {
          ...(interaction.raw_context || {}),
          public_reply_error: errorMessage,
        },
      });
      await updateWebhookEvent(webhookEvent?.id, {
        status: "public_reply_failed",
        accountId: account.id,
        message: errorMessage,
      });
      console.warn("⚠️ Public reply failed; continuing to opening DM");
    }
  }

  const openingDmEnabled = automation.opening_dm_enabled !== false;

  if (!openingDmEnabled && !interaction.resource_delivered_at) {
    await saveAutomationEvent({
      interactionId: interaction.id,
      automationId: automation.id,
      connectedAccountId: account.id,
      instagramSenderId: senderId,
      commentId,
      mediaId,
      eventType: "opening_dm_skipped",
      direction: "internal",
      payload: { reason: "opening_dm_disabled" },
    });

    if (automation.follow_required) {
      await sendFollowPrompt({ account, automation, interaction });
    } else {
      await sendResource({ account, automation, interaction });
    }
    return;
  }

  if (openingDmEnabled && !interaction.opening_dm_sent_at) {
    try {
      const dmResult = await sendOpeningDirectMessage({
        account,
        commentId,
        text: buildOpeningMessageText({ automation, value }),
        buttons: [
          {
            type: "postback",
            title: automation.opening_dm_button_text || "Get Details",
            payload: `GET_DETAILS:${automation.id}:${interaction.id}`,
          },
        ],
      });
      console.log("✅ Opening DM sent:", dmResult.method);
      await saveAutomationEvent({
        interactionId: interaction.id,
        automationId: automation.id,
        connectedAccountId: account.id,
        instagramSenderId: senderId,
        commentId,
        mediaId,
        eventType: "opening_dm_sent",
        direction: "outbound",
        payload: dmResult,
      });
      await upsertInteraction(interaction, {
        opening_dm_sent_at: new Date().toISOString(),
        current_step: "waiting_for_get_details",
        resource_delivery_status:
          interaction.resource_delivery_status || "not_delivered",
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Opening DM failed";

      await saveAutomationEvent({
        interactionId: interaction.id,
        automationId: automation.id,
        connectedAccountId: account.id,
        instagramSenderId: senderId,
        commentId,
        mediaId,
        eventType: "opening_dm_failed",
        direction: "outbound",
        status: "failed",
        errorMessage,
      });
      await upsertInteraction(interaction, {
        current_step: "opening_dm_failed",
        resource_delivery_status: "failed",
        raw_context: {
          ...(interaction.raw_context || {}),
          opening_dm_error: errorMessage,
        },
      });
      await updateWebhookEvent(webhookEvent?.id, {
        status: "dm_failed",
        accountId: account.id,
        message: errorMessage,
      });
    }
  }
}

async function processPostback({ body, messaging }) {
  const senderId = messaging?.sender?.id;
  const payload =
    messaging?.postback?.payload ||
    messaging?.message?.quick_reply?.payload;
  const { action, automationId, interactionId } = parsePayload(payload);

  console.log("👆 Button clicked:", { action, automationId, interactionId });

  await saveAutomationEvent({
    interactionId,
    automationId,
    instagramSenderId: senderId,
    eventType: "button_clicked",
    direction: "inbound",
    payload: messaging,
  });

  const { data: automation, error: automationError } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .maybeSingle();

  if (automationError) throw automationError;
  if (!automation) return;

  const { data: interaction, error: interactionError } = await supabase
    .from("automation_interactions")
    .select("*")
    .eq("id", interactionId)
    .maybeSingle();

  if (interactionError) throw interactionError;
  if (!interaction) return;

  const account =
    (await getAccountForMedia(interaction.media_id)) ||
    (await getAutomationAccount(automation));
  if (!account) return;

  if (action === "GET_DETAILS") {
    if (!automation.follow_required) {
      await sendResource({ account, automation, interaction });
      return;
    }

    const follow = await checkFollowStatus({ account, senderId });
    await saveAutomationEvent({
      interactionId: interaction.id,
      automationId: automation.id,
      connectedAccountId: account.id,
      instagramSenderId: senderId,
      commentId: interaction.comment_id,
      mediaId: interaction.media_id,
      eventType: "follow_check_result",
      direction: "outbound",
      status: follow.status === "following" ? "sent" : "skipped",
      payload: follow,
    });
    await upsertInteraction(interaction, {
      current_step: "follow_check_requested",
      follow_status: follow.status,
    });

    if (follow.status === "following") {
      await sendResource({ account, automation, interaction });
      return;
    }

    const refreshedInteraction = (
      await supabase
        .from("automation_interactions")
        .select("*")
        .eq("id", interaction.id)
        .maybeSingle()
    ).data || interaction;

    if (
      refreshedInteraction.resource_delivery_status === "delivered" ||
      refreshedInteraction.resource_delivered_at ||
      (await hasSentResource(interaction.id))
    ) {
      console.log(
        "↩️ Resource already delivered; sending duplicate notice instead of follow gate"
      );
      await sendAlreadyDeliveredNotice({
        account,
        automation,
        interaction: refreshedInteraction,
      });
      return;
    }

    try {
      await sendFollowPrompt({
        account,
        automation,
        interaction: refreshedInteraction,
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Follow prompt failed";

      await saveAutomationEvent({
        interactionId: interaction.id,
        automationId: automation.id,
        connectedAccountId: account.id,
        instagramSenderId: senderId,
        commentId: interaction.comment_id,
        mediaId: interaction.media_id,
        eventType: "follow_prompt_failed",
        direction: "outbound",
        status: "failed",
        errorMessage,
      });
      await upsertInteraction(interaction, {
        current_step: "follow_prompt_failed",
        follow_status: follow.status,
        raw_context: {
          ...(interaction.raw_context || {}),
          follow_prompt_error: errorMessage,
        },
      });
      console.error("❌ Follow prompt failed:", errorMessage);
    }
    return;
  }

  if (action === "CONFIRM_FOLLOW") {
    const follow = await checkFollowStatus({ account, senderId });
    await saveAutomationEvent({
      interactionId: interaction.id,
      automationId: automation.id,
      connectedAccountId: account.id,
      instagramSenderId: senderId,
      commentId: interaction.comment_id,
      mediaId: interaction.media_id,
      eventType: "follow_check_result",
      direction: "outbound",
      status: follow.status === "following" ? "sent" : "skipped",
      payload: follow,
    });

    if (follow.status === "following") {
      await sendResource({
        account,
        automation,
        interaction: await upsertInteraction(interaction, {
          follow_status: "following",
        }),
      });
      return;
    }

    const stillNotFollowingText =
      automation.still_not_following_message ||
      "It still looks like you haven’t followed yet 😊\nPlease follow the profile first, then tap ‘I’m Following’ again.";

    try {
      await sendInstagramMessage({
        account,
        recipient: { id: senderId },
        text: stillNotFollowingText,
        buttons: [
          {
            type: "postback",
            title: automation.confirm_follow_button_text || "I’m Following ✓",
            payload: `CONFIRM_FOLLOW:${automation.id}:${interaction.id}`,
          },
        ],
      });
    } catch (error) {
      if (!interaction.comment_id) throw error;

      console.warn(
        "⚠️ Still-not-following DM failed; trying comment private reply fallback:",
        error.response?.data || error.message
      );
      await sendCommentPrivateReply({
        account,
        commentId: interaction.comment_id,
        text: stillNotFollowingText,
      });
    }
    await upsertInteraction(interaction, {
      current_step: "still_not_following",
      follow_status: "not_following",
    });
  }
}

async function processWebhook(body) {
  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change?.value) {
          await processComment({ body, entry, change, value: change.value });
        }
      }

      for (const messaging of entry.messaging || []) {
        if (
          messaging.postback?.payload ||
          messaging.message?.quick_reply?.payload
        ) {
          await processPostback({ body, messaging });
        }
      }
    }
  } catch (error) {
    console.error("❌ Webhook processing error:", error.response?.data || error.message);
    await saveWebhookEvent({
      eventType: "error",
      payload: body,
      status: "failed",
      message:
        error.response?.data?.error?.message ||
        error.message ||
        "Webhook processing failed",
    });
  }
}

router.get("/instagram", (req, res) => {
  const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post("/instagram", (req, res) => {
  res.sendStatus(200);
  processWebhook(req.body).catch((error) => {
    console.error("❌ Async webhook error:", error.message);
  });
});

module.exports = router;
