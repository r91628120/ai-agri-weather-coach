import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.js";
import { apiRoutes } from "./routes/index.js";
import { aiaikosCors } from "./middleware/cors.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import {
  successResponse,
  errorResponse
} from "./utils/response.js";

const app = new Hono();

app.use("*", requestIdMiddleware);
app.use("/api/*", aiaikosCors);

app.get("/", (c) => {
  return successResponse(c, {
    project: APP_CONFIG.name,
    version: APP_CONFIG.version,
    message: "AIAKOS Enterprise API Framework v1.0",
    documentation: "/api/v1",
    health: "/api/v1/health"
  });
});

app.get("/api/v1", (c) => {
  return successResponse(c, {
    apiVersion: "v1",
    endpoints: {
      health: "GET /api/v1/health",
      cdseStatus: "GET /api/v1/cdse/status"
    }
  });
});

app.route("/api/v1", apiRoutes);

app.notFound((c) => {
  return errorResponse(
    c,
    "Endpoint not found",
    404,
    "ENDPOINT_NOT_FOUND",
    {
      method: c.req.method,
      path: new URL(c.req.url).pathname
    }
  );
});

app.onError((error, c) => {
  console.error("AIAKOS unhandled error", {
    requestId: c.get("requestId"),
    message: error.message,
    stack: error.stack
  });

  return errorResponse(
    c,
    "An unexpected server error occurred",
    500,
    "INTERNAL_SERVER_ERROR"
  );
});

export default app;