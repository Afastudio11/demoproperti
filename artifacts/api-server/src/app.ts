import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) : true,
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: pool as any,
      tableName: "user_sessions",
    }),
    secret: process.env.SESSION_SECRET ?? (() => {
      if (isProduction) throw new Error("SESSION_SECRET wajib dikonfigurasi di production");
      return "satara-local-dev-secret-change-me";
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// Debug middleware to inspect session and cookies for auth diagnosis
app.use((req, res, next) => {
  if (req.path === "/api/auth/me") {
    logger.info({
      headers: {
        cookie: req.headers.cookie ? `${req.headers.cookie.substring(0, 15)}...` : undefined,
        "x-forwarded-proto": req.headers["x-forwarded-proto"],
        host: req.headers.host,
      },
      sessionID: req.sessionID,
      hasSession: !!req.session,
      userId: (req.session as any)?.userId,
    }, "Incoming request to /api/auth/me");
  }
  next();
});

app.use("/api", router);

if (isProduction) {
  const staticDir = process.env.STATIC_DIR ?? path.join(process.cwd(), "public");
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("{*path}", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}

export default app;
