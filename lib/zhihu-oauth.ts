import "server-only";

export const ZHIHU_OPENAPI_BASE = "https://openapi.zhihu.com";
export const ZHIHU_USER_DATA_BASE = "https://developer.zhihu.com/api/v1/user";

export type ZhihuUser = {
  uid: string;
  hashId: string;
  fullname: string;
  headline: string;
  description: string;
  avatarPath: string;
  url: string;
};

export type ZhihuToken = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
};

export type ZhihuPage<T> = {
  items: T[];
  paging: {
    isEnd: boolean;
    nextOffset?: string;
    totals?: number;
  };
};

export type ZhihuFollowee = {
  fullname: string;
  urlToken: string;
  url: string;
  avatarUrl: string;
  headline: string;
  followerCount: number;
};

export type ZhihuContent = {
  contentType: string;
  url: string;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  title: string;
  summary: string;
};

export type ZhihuHotItem = {
  title: string;
  url: string;
  thumbnailUrl: string;
  summary: string;
};

export type ZhihuSearchItem = {
  title: string;
  contentType: string;
  contentId: string;
  contentText: string;
  url: string;
  commentCount: number;
  voteUpCount: number;
  authorName: string;
  authorityLevel: string;
  editTime: number;
};

export class ZhihuOAuthError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "ZhihuOAuthError";
  }
}

export function getZhihuConfig() {
  return {
    appId: process.env.ZHIHU_OAUTH_APP_ID?.trim() || "",
    appKey: process.env.ZHIHU_OAUTH_APP_KEY?.trim() || "",
    redirectUri: process.env.ZHIHU_OAUTH_REDIRECT_URI?.trim() || "",
    accessSecret: process.env.ZHIHU_ACCESS_SECRET?.trim() || ""
  };
}

export function isOAuthConfigured() {
  const config = getZhihuConfig();
  return Boolean(config.appId && config.appKey && config.redirectUri);
}

export function isUserDataConfigured() {
  return Boolean(getZhihuConfig().accessSecret);
}

export function buildAuthorizationUrl(state: string) {
  const config = getZhihuConfig();
  if (!config.appId || !config.redirectUri) {
    throw new ZhihuOAuthError("知乎 OAuth 尚未配置，请先设置 App ID 和回调地址。", 503);
  }
  const url = new URL("/authorize", ZHIHU_OPENAPI_BASE);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("app_id", config.appId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

async function readJson(response: Response) {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new ZhihuOAuthError("知乎接口返回了无法解析的响应。", 502);
  }
  if (!response.ok) throw new ZhihuOAuthError("知乎接口暂时不可用，请稍后重试。", 502);
  try {
    // Keep large Zhihu uid values lossless before JSON.parse turns numbers into JS Number.
    const losslessText = text.replace(/("uid"\s*:\s*)(-?\d+)/g, '$1"$2"');
    return JSON.parse(losslessText) as Record<string, unknown>;
  } catch {
    throw new ZhihuOAuthError("知乎接口返回了无法解析的响应。", 502);
  }
}

function unwrapData(body: Record<string, unknown>) {
  if (body.data && typeof body.data === "object") return body.data as Record<string, unknown>;
  if (body.Data && typeof body.Data === "object") return body.Data as Record<string, unknown>;
  return body;
}

export async function exchangeAuthorizationCode(code: string): Promise<ZhihuToken> {
  const config = getZhihuConfig();
  if (!config.appId || !config.appKey || !config.redirectUri) {
    throw new ZhihuOAuthError("知乎 OAuth 尚未完整配置。", 503);
  }
  const body = new URLSearchParams({
    app_id: config.appId,
    app_key: config.appKey,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code
  });
  let response: Response;
  try {
    response = await fetch(`${ZHIHU_OPENAPI_BASE}/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store"
    });
  } catch {
    throw new ZhihuOAuthError("无法连接知乎授权服务，请稍后重试。", 502);
  }
  const raw = await readJson(response);
  const data = unwrapData(raw);
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken) throw new ZhihuOAuthError("知乎授权码无效或已过期，请重新登录。", 401);
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    accessToken,
    tokenType: typeof data.token_type === "string" ? data.token_type : "Bearer",
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000
  };
}

export async function fetchZhihuUser(accessToken: string): Promise<ZhihuUser> {
  let response: Response;
  try {
    response = await fetch(`${ZHIHU_OPENAPI_BASE}/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
  } catch {
    throw new ZhihuOAuthError("无法连接知乎用户信息服务，请稍后重试。", 502);
  }
  const raw = await readJson(response);
  const data = unwrapData(raw);
  const uidValue = data.uid ?? data.id;
  const uid = typeof uidValue === "string" || typeof uidValue === "number" ? String(uidValue) : "";
  const fullname = typeof data.fullname === "string" ? data.fullname.trim() : "";
  if (!uid && !fullname) throw new ZhihuOAuthError("知乎未返回有效的用户信息。", 502);
  return {
    uid,
    hashId: typeof data.hash_id === "string" ? data.hash_id : "",
    fullname: fullname || "知乎用户",
    headline: typeof data.headline === "string" ? data.headline : "",
    description: typeof data.description === "string" ? data.description : "",
    avatarPath: typeof data.avatar_path === "string" ? data.avatar_path : "",
    url: typeof data.url === "string" ? data.url : ""
  };
}

async function fetchUserData<T>(
  path: string,
  accessToken: string,
  query: Record<string, string>
): Promise<ZhihuPage<T>> {
  const config = getZhihuConfig();
  if (!config.accessSecret) throw new ZhihuOAuthError("用户数据接口尚未配置 Access Secret。", 503);
  const url = new URL(`${ZHIHU_USER_DATA_BASE}/${path}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.accessSecret}`,
        "X-OAuth-Token": accessToken,
        "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
  } catch {
    throw new ZhihuOAuthError("无法连接知乎用户数据服务，请稍后重试。", 502);
  }
  const raw = await readJson(response);
  const code = raw.Code ?? raw.code;
  if (typeof code === "number" && code !== 0 && code !== 20000) {
    if (code === 20001 || code === 401) throw new ZhihuOAuthError("知乎授权已失效，请重新登录。", 401);
    throw new ZhihuOAuthError("知乎用户数据暂时不可用。", code === 30001 ? 429 : 502);
  }
  const data = unwrapData(raw);
  const rawItems = data.Items ?? data.items;
  const rawPaging = data.Paging ?? data.paging;
  const items = Array.isArray(rawItems) ? rawItems.map(item => {
    if (!item || typeof item !== "object") return item as T;
    const value = item as Record<string, unknown>;
    return {
      ...value,
      fullname: value.fullname ?? value.Fullname,
      urlToken: value.urlToken ?? value.UrlToken,
      url: value.url ?? value.Url,
      avatarUrl: value.avatarUrl ?? value.AvatarUrl,
      headline: value.headline ?? value.Headline,
      followerCount: value.followerCount ?? value.FollowerCount,
      contentType: value.contentType ?? value.ContentType,
      createdAt: value.createdAt ?? value.CreatedAt,
      likeCount: value.likeCount ?? value.LikeCount,
      commentCount: value.commentCount ?? value.CommentCount,
      favoriteCount: value.favoriteCount ?? value.FavoriteCount,
      title: value.title ?? value.Title,
      summary: value.summary ?? value.Summary
    } as T;
  }) : [];
  const pagingRecord = rawPaging && typeof rawPaging === "object" ? rawPaging as Record<string, unknown> : {};
  const nextOffset = pagingRecord.NextOffset ?? pagingRecord.nextOffset;
  return {
    items,
    paging: {
      isEnd: Boolean(pagingRecord.IsEnd ?? pagingRecord.isEnd ?? true),
      nextOffset: typeof nextOffset === "string" || typeof nextOffset === "number" ? String(nextOffset) : undefined,
      totals: typeof (pagingRecord.Totals ?? pagingRecord.totals) === "number" ? Number(pagingRecord.Totals ?? pagingRecord.totals) : undefined
    }
  };
}

export function getFollowees(accessToken: string, offset: string, limit: string) {
  return fetchUserData<ZhihuFollowee>("followees", accessToken, { Offset: offset, Limit: limit });
}

export function getContents(accessToken: string, offset: string, limit: string) {
  return fetchUserData<ZhihuContent>("contents", accessToken, {
    Offset: offset,
    Limit: limit,
    ContentType: "all",
    SortField: "ts",
    SortOrder: "desc"
  });
}

export async function searchZhihu(query: string, count = 10): Promise<ZhihuSearchItem[]> {
  const config = getZhihuConfig();
  if (!config.accessSecret) throw new ZhihuOAuthError("知乎搜索尚未配置 Access Secret。", 503);
  const url = new URL("/api/v1/content/zhihu_search", "https://developer.zhihu.com");
  url.searchParams.set("Query", query);
  url.searchParams.set("Count", String(Math.min(10, Math.max(1, count))));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.accessSecret}`,
        "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
  } catch {
    throw new ZhihuOAuthError("无法连接知乎搜索服务，请稍后重试。", 502);
  }
  const raw = await readJson(response);
  const code = raw.Code ?? raw.code;
  if (typeof code === "number" && code !== 0 && code !== 20000) {
    if (code === 20001 || code === 401) throw new ZhihuOAuthError("知乎搜索鉴权失败，请检查 Access Secret。", 401);
    if (code === 30001 || code === 30002) throw new ZhihuOAuthError("知乎搜索当前受到频率或额度限制，请稍后再试。", 429);
    throw new ZhihuOAuthError("知乎搜索暂时不可用，请稍后重试。", 502);
  }
  const data = unwrapData(raw);
  const rawItems = data.Items ?? data.items;
  if (!Array.isArray(rawItems)) return [];
  return rawItems.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const title = typeof (value.Title ?? value.title) === "string" ? String(value.Title ?? value.title).trim() : "";
    const urlValue = typeof (value.Url ?? value.url) === "string" ? String(value.Url ?? value.url).trim() : "";
    if (!title || !urlValue) return [];
    const numberValue = (key: string, fallback = 0) => {
      const candidate = value[key] ?? value[key.charAt(0).toUpperCase() + key.slice(1)];
      return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
    };
    return [{
      title,
      contentType: String(value.ContentType ?? value.contentType ?? "内容"),
      contentId: String(value.ContentID ?? value.contentID ?? value.contentId ?? ""),
      contentText: String(value.ContentText ?? value.contentText ?? "").replace(/<[^>]+>/g, "").trim(),
      url: urlValue,
      commentCount: numberValue("commentCount"),
      voteUpCount: numberValue("voteUpCount"),
      authorName: String(value.AuthorName ?? value.authorName ?? "知乎用户"),
      authorityLevel: String(value.AuthorityLevel ?? value.authorityLevel ?? ""),
      editTime: numberValue("editTime")
    } satisfies ZhihuSearchItem];
  });
}

export async function getHotList(limit = 20): Promise<ZhihuHotItem[]> {
  const config = getZhihuConfig();
  if (!config.accessSecret) throw new ZhihuOAuthError("知乎热榜尚未配置 Access Secret。", 503);
  const url = new URL("/api/v1/content/hot_list", "https://developer.zhihu.com");
  url.searchParams.set("Limit", String(Math.min(30, Math.max(1, limit))));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.accessSecret}`,
        "X-Request-Timestamp": String(Math.floor(Date.now() / 1000))
      },
      cache: "no-store"
    });
  } catch {
    throw new ZhihuOAuthError("无法连接知乎热榜服务，请稍后重试。", 502);
  }
  const raw = await readJson(response);
  const code = raw.Code ?? raw.code;
  if (typeof code === "number" && code !== 0 && code !== 20000) {
    if (code === 20001 || code === 401) throw new ZhihuOAuthError("知乎热榜鉴权失败，请检查 Access Secret。", 401);
    if (code === 30001 || code === 30002) throw new ZhihuOAuthError("知乎热榜当前受到频率或额度限制，请稍后再试。", 429);
    throw new ZhihuOAuthError("知乎热榜暂时不可用，请稍后重试。", 502);
  }
  const data = unwrapData(raw);
  const rawItems = data.Items ?? data.items;
  if (!Array.isArray(rawItems)) return [];
  return rawItems.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    const title = String(value.Title ?? value.title ?? "").trim();
    const urlValue = String(value.Url ?? value.url ?? "").trim();
    if (!title || !urlValue) return [];
    return [{
      title,
      url: urlValue,
      thumbnailUrl: String(value.ThumbnailUrl ?? value.thumbnailUrl ?? ""),
      summary: String(value.Summary ?? value.summary ?? "")
    } satisfies ZhihuHotItem];
  });
}
