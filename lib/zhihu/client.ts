import type {
  ZhihuContentItem,
  ZhihuFollowee,
  ZhihuHotItem,
  ZhihuPage,
  ZhihuUser
} from "./types";

const API_BASE = "https://developer.zhihu.com/api/v1";
const OAUTH_BASE = "https://openapi.zhihu.com";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少服务端配置 ${name}`);
  return value;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error(`知乎接口请求失败（${response.status}）`);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("知乎接口返回了无法解析的数据");
  }
}

async function platformGet(path: string, params: URLSearchParams, oauthToken?: string) {
  const response = await fetch(`${API_BASE}${path}?${params}`, {
    headers: {
      Authorization: `Bearer ${required("ZHIHU_ACCESS_SECRET")}`,
      "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
      ...(oauthToken ? { "X-OAuth-Token": oauthToken } : {})
    },
    cache: "no-store"
  });
  const payload = await readJson(response);
  if (payload.Code !== 0) throw new Error(String(payload.Message || "知乎接口返回错误"));
  return payload.Data as Record<string, unknown>;
}

export async function getHotList(limit = 20): Promise<ZhihuHotItem[]> {
  const data = await platformGet("/content/hot_list", new URLSearchParams({
    Limit: String(Math.min(30, Math.max(1, limit)))
  }));
  return ((data.Items as Record<string, unknown>[]) || []).map((item) => ({
    title: String(item.Title || ""),
    url: String(item.Url || ""),
    thumbnailUrl: String(item.ThumbnailUrl || ""),
    summary: String(item.Summary || "")
  }));
}

export async function exchangeCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    app_id: required("ZHIHU_OAUTH_APP_ID"),
    app_key: required("ZHIHU_OAUTH_APP_KEY"),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  });
  const response = await fetch(`${OAUTH_BASE}/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  const payload = await readJson(response);
  const accessToken = String(payload.access_token || "");
  if (!accessToken) throw new Error("知乎未返回有效的 OAuth Token");
  return {
    accessToken,
    expiresIn: Number(payload.expires_in) || 3600
  };
}

export async function getOAuthUser(accessToken: string): Promise<ZhihuUser> {
  const response = await fetch(`${OAUTH_BASE}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`获取知乎用户信息失败（${response.status}）`);

  // Preserve a numeric uid that may exceed JavaScript's safe integer range.
  const normalizedRaw = raw.replace(/("uid"\s*:\s*)(\d+)/, '$1"$2"');
  const payload = JSON.parse(normalizedRaw) as Record<string, unknown>;
  const uid = String(payload.uid || "");
  if (!uid && !payload.hash_id) throw new Error("知乎用户信息缺少有效标识");
  return {
    uid,
    hashId: String(payload.hash_id || ""),
    fullname: String(payload.fullname || "知乎用户"),
    gender: String(payload.gender || "unknown"),
    headline: String(payload.headline || ""),
    description: String(payload.description || ""),
    avatarUrl: String(payload.avatar_path || ""),
    url: String(payload.url || "")
  };
}

function paging(data: Record<string, unknown>) {
  const value = (data.Paging || {}) as Record<string, unknown>;
  return {
    isEnd: Boolean(value.IsEnd),
    nextOffset: value.NextOffset == null ? null : String(value.NextOffset),
    totals: Number(value.Totals) || 0
  };
}

export async function getFollowees(oauthToken: string, offset: string, limit = 12): Promise<ZhihuPage<ZhihuFollowee>> {
  const data = await platformGet("/user/followees", new URLSearchParams({ Offset: offset, Limit: String(limit) }), oauthToken);
  return {
    items: ((data.Items as Record<string, unknown>[]) || []).map((item) => ({
      fullname: String(item.Fullname || "知乎用户"),
      urlToken: String(item.UrlToken || ""),
      url: String(item.Url || ""),
      avatarUrl: String(item.AvatarUrl || ""),
      headline: String(item.Headline || ""),
      followerCount: Number(item.FollowerCount) || 0
    })),
    paging: paging(data)
  };
}

export async function getContents(oauthToken: string, offset: string, limit = 10): Promise<ZhihuPage<ZhihuContentItem>> {
  const data = await platformGet("/user/contents", new URLSearchParams({
    Offset: offset,
    Limit: String(limit),
    ContentType: "all",
    SortField: "ts",
    SortOrder: "desc"
  }), oauthToken);
  return {
    items: ((data.Items as Record<string, unknown>[]) || []).map((item) => ({
      contentType: String(item.ContentType || ""),
      url: String(item.Url || ""),
      createdAt: Number(item.CreatedAt) || 0,
      likeCount: Number(item.LikeCount) || 0,
      commentCount: Number(item.CommentCount) || 0,
      favoriteCount: Number(item.FavoriteCount) || 0,
      title: String(item.Title || "未命名创作"),
      summary: String(item.Summary || "")
    })),
    paging: paging(data)
  };
}
