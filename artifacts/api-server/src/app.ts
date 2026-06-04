import express, { type Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

export function createApp(): { app: Express; httpServer: Server } {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  const httpServer = createServer(app);
  return { app, httpServer };
}
