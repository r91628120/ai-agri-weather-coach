import { Hono } from "hono";
import { notImplemented } from "./not-implemented.js";

export const ndviImageRoutes = new Hono();
ndviImageRoutes.post("/", notImplemented);
