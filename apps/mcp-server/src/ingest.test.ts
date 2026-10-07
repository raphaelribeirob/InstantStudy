import assert from "node:assert/strict";
import test from "node:test";
import { ingestFiles } from "./ingest.js";

test("inline text upload is actually ingested", async () => {
  const text = "ATP synthase uses a proton gradient to generate ATP.";
  const result = await ingestFiles([
    {
      file_id: "inline-1",
      file_name: "biology.txt",
      mime_type: "text/plain",
      inline_base64: Buffer.from(text, "utf8").toString("base64"),
    },
  ]);

  assert.match(result.text, /ATP synthase/);
  assert.equal(result.files[0]?.status, "extracted");
  assert.equal(result.files[0]?.extraction, "text");
});
