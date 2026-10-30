import Fastify from "fastify";
import type { HealthResponse } from "@polebio/shared";

const app = Fastify({
  logger: true
});

app.get<{ Reply: HealthResponse }>("/api/health", async () => ({
  status: "ok",
  service: "polebio-api",
  timestamp: new Date().toISOString()
}));

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
