#!/usr/bin/env node
/**
 * ONE-TIME indexed FSRS history backfill.
 * Default = no database access. --apply requires explicit PREVIEW approval.
 * Apply the 0004 migration before running this; NEVER execute on production.
 */
import { neon } from "@neondatabase/serverless";

const apply=process.argv.includes("--apply");
if (!apply) {
  console.log("DRY RUN: no Neon connection attempted or data changed.");
  console.log("Requires a dedicated preview DATABASE_URL, migration 0004, and --apply approval.");
  process.exit(0);
}
if (process.env.INSTANTSTUDY_NEON_PREVIEW_CONFIRMED !== "yes" ||
    process.env.INSTANTSTUDY_BACKFILL_APPROVED !== "yes" ||
    !process.env.DATABASE_URL?.trim()) {
  console.error("Refusing backfill: preview-only approval and DATABASE_URL are required.");
  process.exit(2);
}

const sql=neon(process.env.DATABASE_URL.trim());
const valid=await sql`
 SELECT to_regclass('public.instantstudy_sessions')::text AS sessions,
        to_regclass('public.instantstudy_concept_progress')::text AS progress
`;
if(!valid[0]?.sessions||!valid[0]?.progress) {
  console.error("Refusing backfill: required tables missing."); process.exit(3);
}

let cursorTime="1970-01-01T00:00:00.000Z";
let cursorId="00000000-0000-0000-0000-000000000000";
let sessions=0,attempted=0,batches=0;
while(true){
  const rows=await sql`
    SELECT id::text, learner_id, title, updated_at, session_json
    FROM instantstudy_sessions
    WHERE learner_id IS NOT NULL
      AND (updated_at,id) > (${cursorTime}::timestamptz, ${cursorId}::uuid)
    ORDER BY updated_at ASC,id ASC
    LIMIT 100
  `;
  if (!rows.length) break;
  const latest=new Map();
  for (const row of rows) {
    const session=row.session_json || {};
    for(const concept of Array.isArray(session.concepts)?session.concepts:[]) {
      if(!concept?.lastSeenAt || !concept?.nextReviewAt || !concept?.label)continue;
      const key=String(concept.label).trim().toLocaleLowerCase();
      if(!key || Number.isNaN(Date.parse(concept.lastSeenAt)) ||
          Number.isNaN(Date.parse(concept.nextReviewAt)))continue;
      const id=`${row.learner_id}\u0000${key}`;
      const data={
        learner_id:String(row.learner_id),
        concept_key:key,
        session_id:String(row.id),
        material_id:session.materialId||null,
        title:String(row.title||"Study"),
        concept_id:String(concept.id),
        label:String(concept.label),
        source_excerpt:String(concept.sourceExcerpt||""),
        mastery:Number(concept.mastery||0),
        difficulty:Number(concept.difficulty||0),
        last_seen_at:concept.lastSeenAt,
        next_review_at:concept.nextReviewAt,
        missing_concepts:concept.missingConcepts||[],
        concept_json:concept
      };
      const before=latest.get(id);
      if(!before || data.last_seen_at >= before.last_seen_at)latest.set(id,data);
    }
  }
  const progress=[...latest.values()];
  if(progress.length){
    const raw=JSON.stringify(progress);
    await sql`
      INSERT INTO instantstudy_concept_progress (
        learner_id, concept_key, session_id, material_id, title,
        concept_id, label, source_excerpt, mastery, difficulty,
        last_seen_at, next_review_at, missing_concepts, concept_json
      )
      SELECT p.learner_id,p.concept_key,p.session_id,p.material_id,p.title,
             p.concept_id,p.label,p.source_excerpt,p.mastery,p.difficulty,
             p.last_seen_at,p.next_review_at,p.missing_concepts,p.concept_json
      FROM jsonb_to_recordset(${raw}::jsonb) AS p (
        learner_id text,concept_key text,session_id uuid,material_id uuid,title text,
        concept_id text,label text,source_excerpt text,mastery float8,difficulty float8,
        last_seen_at timestamptz,next_review_at timestamptz,missing_concepts jsonb,concept_json jsonb
      )
      ON CONFLICT (learner_id,concept_key) DO UPDATE SET
        session_id=EXCLUDED.session_id,material_id=EXCLUDED.material_id,
        title=EXCLUDED.title,concept_id=EXCLUDED.concept_id,
        label=EXCLUDED.label,source_excerpt=EXCLUDED.source_excerpt,
        mastery=EXCLUDED.mastery,difficulty=EXCLUDED.difficulty,
        last_seen_at=EXCLUDED.last_seen_at,next_review_at=EXCLUDED.next_review_at,
        missing_concepts=EXCLUDED.missing_concepts,concept_json=EXCLUDED.concept_json,
        updated_at=NOW()
      WHERE instantstudy_concept_progress.last_seen_at <= EXCLUDED.last_seen_at
    `;
    attempted+=progress.length;
  }
  sessions+=rows.length;batches++;
  const last=rows.at(-1);
  cursorTime=new Date(last.updated_at).toISOString();cursorId=String(last.id);
  if(batches%10===0)console.log(JSON.stringify({batches,sessions,attempted}));
}
console.log(JSON.stringify({complete:true,sessions,attempted,batches,
  note:"Compare indexed due counts to legacy scans in preview before enabling INSTANTSTUDY_INDEXED_REVIEW_ENABLED."}));
