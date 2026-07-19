import { cors } from "hono/cors";

const allowedOrigins = new Set([
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "https://r91628120.github.io"
]);

export const aiaikosCors = cors({
  origin: (origin) => {
    if (!origin) {
      return "*";
    }

    if (allowedOrigins.has(origin)) {
      return origin;
    }

    return null;
  },
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID"
  ],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400
});
