import { Hono } from "hono";
import { notImplemented } from "./not-implemented.js";

export const satelliteSearchRoutes = new Hono();
satelliteSearchRoutes.get("/", notImplemented);
