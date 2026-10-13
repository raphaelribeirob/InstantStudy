import assert from "node:assert/strict";
import test from "node:test";
import { MemoryMaterialStore } from "./materialStore.js";
import { schemaManagedExternally } from "./databasePolicy.js";

function assets() {
  return { summary: "Summary", outline: [], keyConcepts: [], flashcards: [],
    generatedBy: "test" };
}

test("metadata-only library excludes original content and AI assets", async () => {
  const store = new MemoryMaterialStore();
  await store.save({
    learnerId:"learner-001",title:"Biology",
    content:"Private copyrighted student's notes",sourceType:"paste",
    sourceNames:["Biology notes"],assets:assets(),
  });
  await store.save({
    learnerId:"learner-002",title:"Biology",
    content:"Another learner private data",sourceType:"paste",
    sourceNames:[],assets:assets(),
  });
  const page=await store.listSummaries("learner-001");
  assert.equal(page.materials.length,1);
  assert.equal(page.materials[0].title,"Biology");
  assert.equal("content" in page.materials[0],false);
  assert.equal("assets" in page.materials[0],false);
  assert.equal(page.nextCursor,null);
  assert.equal((await store.listSummaries("learner-002")).materials.length,1);
});

test("keyset material pages never repeat and respect owner and title filtering", async () => {
  const store=new MemoryMaterialStore();
  for(let i=0;i<8;i++)await store.save({
    learnerId:"learner-100",title:`Math ${i}`,content:"Secret",
    sourceType:"paste",sourceNames:[],assets:assets(),
  });
  await store.save({
    learnerId:"learner-200",title:"Math outsider",content:"Secret",
    sourceType:"paste",sourceNames:[],assets:assets(),
  });
  const ids=new Set<string>();
  let cursor: {updatedAt:string;id:string}|undefined;
  for(let p=0;p<5;p++){
    const page=await store.listSummaries("learner-100","Math",3,cursor);
    for(const material of page.materials){
      assert.equal(ids.has(material.id),false);
      ids.add(material.id);
      assert.equal(material.learnerId,"learner-100");
    }
    if(!page.nextCursor)break;
    cursor=page.nextCursor;
  }
  assert.equal(ids.size,8);
  assert.equal((await store.listSummaries("learner-100","Biology")).materials.length,0);
});

test("externally managed schema is opt-in and never inferred from a client", () => {
  const before=process.env.INSTANTSTUDY_SCHEMA_MANAGED;
  try {
    delete process.env.INSTANTSTUDY_SCHEMA_MANAGED;
    assert.equal(schemaManagedExternally(),false);
    process.env.INSTANTSTUDY_SCHEMA_MANAGED="true";
    assert.equal(schemaManagedExternally(),true);
    process.env.INSTANTSTUDY_SCHEMA_MANAGED="false";
    assert.equal(schemaManagedExternally(),false);
  } finally {
    if(before===undefined)delete process.env.INSTANTSTUDY_SCHEMA_MANAGED;
    else process.env.INSTANTSTUDY_SCHEMA_MANAGED=before;
  }
});
