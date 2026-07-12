import { Hono } from "hono";
import { healthRoutes } from "./health.js";
import { cdseRoutes } from "./cdse.js";

export const apiRoutes = new Hono();

apiRoutes.route("/health", healthRoutes);
apiRoutes.route("/cdse", cdseRoutes);