const CDSE_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

/**
 * Workers 執行個體內的短期 Token 快取。
 * 此快取不是永久資料庫，但可避免每次請求都重新申請 Token。
 */
let tokenCache = {
  accessToken: null,
  tokenType: null,
  expiresAt: 0
};

export class CdseAuthError extends Error {
  constructor(
    message,
    code = "CDSE_AUTH_ERROR",
    providerStatus = null
  ) {
    super(message);
    this.name = "CdseAuthError";
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

export function isCdseConfigured(env) {
  return Boolean(
    env?.CDSE_CLIENT_ID?.trim() &&
    env?.CDSE_CLIENT_SECRET?.trim()
  );
}

function validateCredentials(env) {
  if (!isCdseConfigured(env)) {
    throw new CdseAuthError(
      "CDSE Client ID 或 Client Secret 尚未設定",
      "CDSE_NOT_CONFIGURED"
    );
  }
}

function getCachedToken() {
  const now = Date.now();

  if (
    tokenCache.accessToken &&
    tokenCache.expiresAt > now
  ) {
    return {
      accessToken: tokenCache.accessToken,
      tokenType: tokenCache.tokenType,
      expiresIn: Math.max(
        0,
        Math.floor((tokenCache.expiresAt - now) / 1000)
      ),
      expiresAt: new Date(tokenCache.expiresAt).toISOString(),
      cached: true
    };
  }

  return null;
}

async function parseJsonSafely(response) {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new CdseAuthError(
      "CDSE OAuth 回傳了無法解析的資料",
      "CDSE_INVALID_RESPONSE",
      response.status
    );
  }
}

export async function getCdseAccessToken(env, options = {}) {
  validateCredentials(env);

  const forceRefresh = Boolean(options.forceRefresh);

  if (!forceRefresh) {
    const cachedToken = getCachedToken();

    if (cachedToken) {
      return cachedToken;
    }
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.CDSE_CLIENT_ID.trim(),
    client_secret: env.CDSE_CLIENT_SECRET.trim()
  });

  let response;

  try {
    response = await fetch(CDSE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body
    });
  } catch {
    throw new CdseAuthError(
      "目前無法連線至 CDSE OAuth 服務",
      "CDSE_NETWORK_ERROR"
    );
  }

  const data = await parseJsonSafely(response);

  if (!response.ok || !data.access_token) {
    const safeMessage =
      data.error_description ||
      data.error ||
      "CDSE OAuth 驗證失敗";

    throw new CdseAuthError(
      safeMessage,
      "CDSE_TOKEN_REQUEST_FAILED",
      response.status
    );
  }

  const expiresIn = Number(data.expires_in);

  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new CdseAuthError(
      "CDSE OAuth 未提供有效的 Token 到期時間",
      "CDSE_INVALID_EXPIRY",
      response.status
    );
  }

  /*
   * 提前 60 秒視為過期，避免正在呼叫 Sentinel Hub API 時
   * Token 剛好失效。
   */
  const safetyBufferSeconds = Math.min(
    60,
    Math.max(5, Math.floor(expiresIn * 0.1))
  );

  const usableLifetimeSeconds = Math.max(
    1,
    expiresIn - safetyBufferSeconds
  );

  tokenCache = {
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    expiresAt:
      Date.now() + usableLifetimeSeconds * 1000
  };

  return {
    accessToken: tokenCache.accessToken,
    tokenType: tokenCache.tokenType,
    expiresIn: usableLifetimeSeconds,
    expiresAt: new Date(
      tokenCache.expiresAt
    ).toISOString(),
    cached: false
  };
}

/**
 * 對瀏覽器只回傳安全的連線資訊。
 * 絕不包含 accessToken。
 */
export async function getCdseConnectionStatus(env) {
  const token = await getCdseAccessToken(env);

  return {
    configured: true,
    connected: true,
    provider: "Copernicus Data Space Ecosystem",
    authentication: "OAuth2 Client Credentials",
    tokenType: token.tokenType,
    expiresIn: token.expiresIn,
    expiresAt: token.expiresAt,
    tokenSource: token.cached ? "cache" : "new"
  };
}