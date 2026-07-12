import { Hono } from "hono";
import {
  getCdseConnectionStatus,
  isCdseConfigured
} from "../services/cdse-auth.js";
import {
  successResponse,
  errorResponse
} from "../utils/response.js";

export const cdseRoutes = new Hono();

cdseRoutes.get("/status", async (c) => {
  if (!isCdseConfigured(c.env)) {
    return errorResponse(
      c,
      "CDSE OAuth 尚未完成設定",
      503,
      "CDSE_NOT_CONFIGURED",
      {
        requiredSecrets: [
          "CDSE_CLIENT_ID",
          "CDSE_CLIENT_SECRET"
        ]
      }
    );
  }

  try {
    const status = await getCdseConnectionStatus(c.env);

    return successResponse(c, status);
  } catch (error) {
    /*
     * 日誌只能寫安全資訊。
     * 不可輸出 Client Secret 或 Access Token。
     */
    console.error("CDSE authentication failed", {
      requestId: c.get("requestId"),
      code: error.code || "CDSE_AUTH_ERROR",
      providerStatus: error.providerStatus || null,
      message: error.message
    });

    return errorResponse(
      c,
      "無法完成 CDSE OAuth 驗證",
      502,
      error.code || "CDSE_AUTH_FAILED",
      {
        providerStatus: error.providerStatus || null,
        reason: error.message
      }
    );
  }
});