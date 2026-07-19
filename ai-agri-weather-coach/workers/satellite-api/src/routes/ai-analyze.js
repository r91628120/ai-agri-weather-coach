import { Hono } from "hono";
import { notImplemented } from "./not-implemented.js";

export const aiAnalyzeRoutes = new Hono();
aiAnalyzeRoutes.post("/", notImplemented);
