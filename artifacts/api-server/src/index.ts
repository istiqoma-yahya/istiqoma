import { createApp } from "./app";
import { registerRoutes } from "./routes/routes";
import { logger } from "./lib/logger";
import healthRouter from "./routes/health";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const { app, httpServer } = createApp();

app.use("/api", healthRouter);

registerRoutes(httpServer, app).then(() => {
  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
