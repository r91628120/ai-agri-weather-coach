import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.js";
import { apiRoutes } from "./routes/index.js";
import { aiaikosCors } from "./middleware/cors.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { handleUnhandledError } from "./middleware/error-handler.js";
import {
  successResponse,
  errorResponse
} from "./utils/response.js";

const app = new Hono();

app.use("*", requestIdMiddleware);
app.use("*", requestLoggerMiddleware);
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
      cdseStatus: "GET /api/v1/cdse/status",
      ndviStatistics: "POST /api/v1/ndvi/statistics",
      ndviImage: "POST /api/v1/ndvi/image",
      satelliteSearch: "POST /api/v1/satellite/search"
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

app.onError(handleUnhandledError);

export default app;
