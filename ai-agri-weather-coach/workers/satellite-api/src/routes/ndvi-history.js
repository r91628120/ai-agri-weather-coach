import { Hono } from "hono";
import { notImplemented } from "./not-implemented.js";

export const ndviHistoryRoutes = new Hono();
ndviHistoryRoutes.get("/", notImplemented);
