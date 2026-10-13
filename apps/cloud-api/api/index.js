import { createApp } from "../src/app.js";

const app = createApp();
export default app;

if (!process.env.VERCEL && process.env.INSTANT_CLOUD_STANDALONE === "true") {
  app.listen(Number(process.env.PORT || 8080));
}
