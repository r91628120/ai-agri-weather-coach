import { Hono } from "hono";
import { APP_CONFIG } from "../config/app.js";
import { successResponse } from "../utils/response.js";

export const healthRoutes = new Hono();

healthRoutes.get("/", (c) => {
  return successResponse(c, {
    project: APP_CONFIG.name,
    version: APP_CONFIG.version,
    status: "online",
    runtime: "Cloudflare Workers",
    environment: c.env.ENVIRONMENT || "development",
    cdseConfigured: Boolean(
      c.env.CDSE_CLIENT_ID &&
      c.env.CDSE_CLIENT_SECRET
    )
  });
});