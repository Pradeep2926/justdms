const axios = require("axios");
const { randomUUID } = require("crypto");
const supabase = require("../lib/supabase");

const META_GRAPH_VERSION = "v19.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const INSTAGRAM_PROFILE_FIELDS =
  "id,username,name,profile_picture_url,followers_count,follows_count,media_count";

function addDays(days) {
  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();
}

function metaError(error, fallback) {
  return (
    error.response?.data?.error?.message ||
    error.message ||
    fallback
  );
}

async function graphGet(path, accessToken, params = {}) {
  try {
    const requestParams = {
      ...params,
    };

    if (accessToken) {
      requestParams.access_token = accessToken;
    }

    const response = await axios.get(
      `${GRAPH_BASE_URL}/${path}`,
      {
        params: requestParams,
        timeout: 20000,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      metaError(error, `Meta request failed for ${path}`)
    );
  }
}

async function exchangeCodeForToken({
  code,
  appId,
  appSecret,
  redirectUri,
}) {
  const shortToken = await graphGet(
    "oauth/access_token",
    undefined,
    {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }
  );

  const longToken = await graphGet(
    "oauth/access_token",
    undefined,
    {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken.access_token,
    }
  );

  return {
    accessToken:
      longToken.access_token || shortToken.access_token,
    expiresIn:
      longToken.expires_in ||
      shortToken.expires_in ||
      60 * 24 * 60 * 60,
  };
}

async function findInstagramBusinessAccount(accessToken) {
  const pages = await graphGet(
    "me/accounts",
    accessToken,
    {
      fields:
        `id,name,access_token,instagram_business_account{${INSTAGRAM_PROFILE_FIELDS}}`,
    }
  );

  const page = pages.data?.find(
    (candidate) =>
      candidate.instagram_business_account?.id
  );

  if (!page) {
    throw new Error(
      "No Instagram Business or Creator account found. Connect an Instagram professional account to a Facebook Page first."
    );
  }

  return {
    page,
    instagramAccount:
      page.instagram_business_account,
  };
}

async function fetchInstagramProfile(
  instagramUserId,
  accessToken
) {
  return graphGet(
    instagramUserId,
    accessToken,
    {
      fields: INSTAGRAM_PROFILE_FIELDS,
    }
  );
}

async function fetchInstagramMedia(
  instagramUserId,
  accessToken
) {
  const result = await graphGet(
    `${instagramUserId}/media`,
    accessToken,
    {
      fields:
        "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count",
      limit: 25,
    }
  );

  return result.data || [];
}

async function fetchMediaComments(
  mediaId,
  accessToken
) {
  try {
    const result = await graphGet(
      `${mediaId}/comments`,
      accessToken,
      {
        fields:
          "id,text,username,timestamp,like_count,replies{id,text,username,timestamp}",
        limit: 50,
      }
    );

    return result.data || [];
  } catch (error) {
    console.warn(
      `Comment sync skipped for ${mediaId}: ${error.message}`
    );

    return [];
  }
}

async function getAccountByEmail(userEmail) {
  if (!userEmail) {
    throw new Error("User email is required.");
  }

  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function saveAccount(account) {
  if (!account?.user_email) {
    throw new Error(
      "Account user_email is required."
    );
  }

  const existing = await getAccountByEmail(
    account.user_email
  );

  const now = new Date().toISOString();

  const saved = {
    id:
      existing?.id ||
      account.id ||
      randomUUID(),
    connected_at:
      existing?.connected_at || now,
    ...existing,
    ...account,
    last_sync: now,
    updated_at: now,
  };

  if (existing) {
    const { error } = await supabase
      .from("instagram_accounts")
      .update(saved)
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase
      .from("instagram_accounts")
      .insert(saved);

    if (error) {
      throw error;
    }
  }

  return saved;
}

async function saveMedia(accountId, mediaItems) {
  for (const item of mediaItems) {
    const row = {
      id: item.id,
      account_id: accountId,
      caption: item.caption || null,
      media_type: item.media_type || null,
      media_url: item.media_url || null,
      thumbnail_url:
        item.thumbnail_url || null,
      timestamp: item.timestamp || null,
      permalink: item.permalink || null,
      like_count: item.like_count ?? null,
      comments_count:
        item.comments_count ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } =
      await supabase
        .from("instagram_media")
        .select("id")
        .eq("id", row.id)
        .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      const { error } = await supabase
        .from("instagram_media")
        .update(row)
        .eq("id", row.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("instagram_media")
        .insert(row);

      if (error) {
        throw error;
      }
    }
  }
}

async function saveComments(
  accountId,
  mediaId,
  comments
) {
  for (const comment of comments) {
    const row = {
      id: comment.id,
      account_id: accountId,
      media_id: mediaId,
      text: comment.text || null,
      username: comment.username || null,
      timestamp: comment.timestamp || null,
      like_count: comment.like_count ?? null,
      raw_payload: comment,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } =
      await supabase
        .from("instagram_comments")
        .select("id")
        .eq("id", row.id)
        .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      const { error } = await supabase
        .from("instagram_comments")
        .update(row)
        .eq("id", row.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("instagram_comments")
        .insert(row);

      if (error) {
        throw error;
      }
    }
  }
}

async function syncAccount(userEmail) {
  const account = await getAccountByEmail(
    userEmail
  );

  if (!account) {
    return null;
  }

  const token =
    account.access_token ||
    account.page_access_token;

  const instagramUserId =
    account.instagram_user_id ||
    account.instagram_account_id;

  if (!token) {
    throw new Error(
      "Instagram account is missing an access token. Reconnect Instagram."
    );
  }

  if (!instagramUserId) {
    throw new Error(
      "Instagram account is missing an Instagram user ID. Reconnect Instagram."
    );
  }

  const profile = await fetchInstagramProfile(
    instagramUserId,
    token
  );

  const media = await fetchInstagramMedia(
    instagramUserId,
    token
  );

  const now = new Date().toISOString();

  const tokenExpired =
    account.expires_at &&
    new Date(account.expires_at).getTime() <=
      Date.now();

  const savedAccount = await saveAccount({
    ...account,
    username: profile.username,
    instagram_username: profile.username,
    instagram_user_id: profile.id,
    instagram_account_id: profile.id,
    name: profile.name || null,
    profile_picture_url:
      profile.profile_picture_url || null,
    profile_picture:
      profile.profile_picture_url || null,
    followers:
      profile.followers_count ?? null,
    followers_count:
      profile.followers_count ?? null,
    following:
      profile.follows_count ?? null,
    follows_count:
      profile.follows_count ?? null,
    media_count:
      profile.media_count ?? null,
    account_type:
      profile.account_type || null,
    token_status: tokenExpired
      ? "expired"
      : "active",
    last_sync: now,
  });

  await saveMedia(savedAccount.id, media);

  for (const item of media.slice(0, 10)) {
    const comments =
      await fetchMediaComments(
        item.id,
        token
      );

    await saveComments(
      savedAccount.id,
      item.id,
      comments
    );
  }

  return {
    account: savedAccount,
    media,
  };
}

async function connectInstagramAccount({
  userEmail,
  code,
  metaConfig,
}) {
  if (!userEmail) {
    throw new Error("User email is required.");
  }

  if (!code) {
    throw new Error(
      "Meta authorization code is required."
    );
  }

  if (
    !metaConfig?.appId ||
    !metaConfig?.appSecret ||
    !metaConfig?.redirectUri
  ) {
    throw new Error(
      "Meta configuration is incomplete."
    );
  }

  const { accessToken, expiresIn } =
    await exchangeCodeForToken({
      code,
      appId: metaConfig.appId,
      appSecret: metaConfig.appSecret,
      redirectUri:
        metaConfig.redirectUri,
    });

  const { page, instagramAccount } =
    await findInstagramBusinessAccount(
      accessToken
    );

  const pageAccessToken =
    page.access_token || accessToken;

  const profile =
    await fetchInstagramProfile(
      instagramAccount.id,
      pageAccessToken
    );

  const now = new Date().toISOString();

  const expiresAt = new Date(
    Date.now() + expiresIn * 1000
  ).toISOString();

  const saved = await saveAccount({
    user_email: userEmail,
    user_id: userEmail,
    instagram_user_id: profile.id,
    instagram_account_id: profile.id,
    facebook_page_id: page.id,
    page_id: page.id,
    business_account_id:
      instagramAccount.id,
    username: profile.username,
    instagram_username:
      profile.username,
    name: profile.name || null,
    account_type:
      profile.account_type || null,
    profile_picture_url:
      profile.profile_picture_url || null,
    profile_picture:
      profile.profile_picture_url || null,
    followers:
      profile.followers_count ?? null,
    followers_count:
      profile.followers_count ?? null,
    following:
      profile.follows_count ?? null,
    follows_count:
      profile.follows_count ?? null,
    media_count:
      profile.media_count ?? null,
    access_token: accessToken,
    page_access_token: pageAccessToken,
    refresh_token: null,
    expires_at: expiresAt,
    token_expires_at: expiresAt,
    token_status: "active",
    webhook_enabled: false,
    connected_at: now,
    last_sync: now,
  });

  syncAccount(userEmail).catch((error) => {
    console.error(
      `Initial Instagram sync failed for ${userEmail}:`,
      error.message
    );
  });

  return saved;
}

async function getDashboard(userEmail) {
  if (!userEmail) {
    throw new Error("User email is required.");
  }

  const account = await getAccountByEmail(
    userEmail
  );

  if (!account) {
    return {
      connected: false,
      account: null,
      media: [],
      comments: [],
    };
  }

  const {
    data: media = [],
    error: mediaError,
  } = await supabase
    .from("instagram_media")
    .select("*")
    .eq("account_id", account.id)
    .order("timestamp", {
      ascending: false,
    });

  if (mediaError) {
    throw mediaError;
  }

  const {
    data: comments = [],
    error: commentsError,
  } = await supabase
    .from("instagram_comments")
    .select("*")
    .eq("account_id", account.id)
    .order("timestamp", {
      ascending: false,
    });

  if (commentsError) {
    throw commentsError;
  }

  return {
    connected: true,
    account,
    media,
    comments,
  };
}

module.exports = {
  connectInstagramAccount,
  getDashboard,
  syncAccount,
};
