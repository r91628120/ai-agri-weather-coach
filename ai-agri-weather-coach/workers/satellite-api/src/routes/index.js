import { Hono } from "hono";
import { healthRoutes } from "./health.js";
import { cdseRoutes } from "./cdse.js";
import { ndviStatisticsRoutes } from "./ndvi-statistics.js";
import { ndviImageRoutes } from "./ndvi-image.js";
import { satelliteSearchRoutes } from "./satellite-search.js";
import { ndviHistoryRoutes } from "./ndvi-history.js";
import { aiAnalyzeRoutes } from "./ai-analyze.js";

export const apiRoutes = new Hono();

apiRoutes.route("/health", healthRoutes);
apiRoutes.route("/cdse", cdseRoutes);
apiRoutes.route("/ndvi/statistics", ndviStatisticsRoutes);
apiRoutes.route("/ndvi/image", ndviImageRoutes);
apiRoutes.route("/satellite/search", satelliteSearchRoutes);
apiRoutes.route("/ndvi/history", ndviHistoryRoutes);
apiRoutes.route("/ai/analyze", aiAnalyzeRoutes);
