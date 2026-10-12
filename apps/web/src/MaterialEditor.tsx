import { useEffect, useState } from "react";
import { duplicateStudyMaterial, updateStudyMaterial, type StudyAssets, type StudyMaterial } from "./study";
import "./material-editor.css";

/** Quizlet-style editable cards and study guides, persisted through the owner-scoped API. */
export function MaterialEditor({material,onSaved,onDuplicated}:{material:StudyMaterial;onSaved:(material:StudyMaterial)=>void;onDuplicated:(material:StudyMaterial)=>void}) {
  const [open,setOpen]=useState(false);
  const [title,setTitle]=useState(material.title);
  const [summary,setSummary]=useState(material.assets.summary);
  const [outline,setOutline]=useState(material.assets.outline.join("\n"));
  const [cards,setCards]=useState<StudyAssets["flashcards"]>(material.assets.flashcards);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const pt=typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("pt");

  useEffect(()=>{
    setTitle(material.title);
    setSummary(material.assets.summary);
    setOutline(material.assets.outline.join("\n"));
    setCards(material.assets.flashcards.map(card=>({...card})));
    setError("");
  },[material.id,material.updatedAt]);

  const change=(index:number,field:"front"|"back"|"concept",value:string)=>{
    setCards(prev=>prev.map((card,i)=>i===index?{...card,[field]:value}:card));
  };
  const move=(index:number,direction:-1|1)=>{
    setCards(prev=>{
      const nextIndex=index+direction;
      if(nextIndex<0||nextIndex>=prev.length)return prev;
      const next=[...prev];
      [next[index],next[nextIndex]]=[next[nextIndex],next[index]];
      return next;
    });
  };
  const save=async()=>{
    const lines=outline.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const cleanCards=cards.map(c=>({
      ...c,front:c.front.trim(),back:c.back.trim(),concept:c.concept.trim(),
      // An edited answer is expressly authored/approved by the learner.
      sourceExcerpt:c.back.trim().slice(0,2000),
    }));
    if(!title.trim()||!summary.trim()||!lines.length||!cleanCards.length||
      cleanCards.some(c=>c.front.length<5||!c.back||!c.concept)) {
      setError(pt?"Preencha resumo, tópicos, perguntas e respostas.":"Complete the summary, outline, questions and answers.");
      return;
    }
    setBusy(true);setError("");
    try {
      const {material:result}=await updateStudyMaterial({
        materialId:material.id,title:title.trim().slice(0,200),summary:summary.trim().slice(0,12000),
        outline:lines.slice(0,40),flashcards:cleanCards.slice(0,100),
      });
      onSaved(result);setOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Could not save changes.");}
    finally{setBusy(false);}
  };
  const duplicate = async () => {
    setBusy(true); setError("");
    try {
      const result = await duplicateStudyMaterial(material.id);
      onDuplicated(result.material);
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not duplicate this material.");
    } finally { setBusy(false); }
  };
  const exportCards = () => {
    const protect = (value: string) => {
      const safe = /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const rows = [["Question", "Answer", "Concept"],
      ...material.assets.flashcards.map(card => [card.front, card.back, card.concept])];
    const text = "\uFEFF" + rows.map(row => row.map(protect).join(",")).join("\r\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "instantstudy-flashcards.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  if(!/^[a-f0-9-]{36}$/i.test(material.id))return null;
  return <section className="is-edit-container">
    <div className="is-edit-actions">
      <button type="button" disabled={busy} onClick={()=>void duplicate()}>{pt?"Duplicar material":"Duplicate study set"}</button>
      <button type="button" onClick={exportCards}>{pt?"Exportar cartões CSV":"Export cards CSV"}</button>
    </div>
    <button type="button" className="is-edit-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      {open?(pt?"Fechar editor":"Close editor"):(pt?"Editar guia e flashcards":"Edit guide and flashcards")}
    </button>
    {!open&&error&&<p role="alert" className="is-edit-error">{error}</p>}
    {open&&<div className="is-edit-panel">
      <h2>{pt?"Personalize seu material":"Personalize your study set"}</h2>
      <label>{pt?"Título":"Title"}<input maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label>{pt?"Resumo":"Summary"}<textarea rows={4} maxLength={12000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
      <label>{pt?"Tópicos (um por linha)":"Outline (one per line)"}<textarea rows={5} value={outline} onChange={e=>setOutline(e.target.value)}/></label>
      <h3>{pt?"Cartões":"Flashcards"}</h3>
      {cards.map((card,index)=><article key={card.id} className="is-edit-card">
        <strong>{pt?"Cartão":"Card"} {index+1}</strong>
        <label>{pt?"Conceito":"Concept"}<input maxLength={200} value={card.concept} onChange={e=>change(index,"concept",e.target.value)}/></label>
        <label>{pt?"Pergunta":"Question"}<textarea rows={2} maxLength={1000} value={card.front} onChange={e=>change(index,"front",e.target.value)}/></label>
        <label>{pt?"Resposta":"Answer"}<textarea rows={2} maxLength={2000} value={card.back} onChange={e=>change(index,"back",e.target.value)}/></label>
        <div className="is-edit-actions">
          <button type="button" disabled={index===0} onClick={()=>move(index,-1)} aria-label={pt?"Mover acima":"Move up"}>↑</button>
          <button type="button" disabled={index===cards.length-1} onClick={()=>move(index,1)} aria-label={pt?"Mover abaixo":"Move down"}>↓</button>
          <button type="button" disabled={cards.length<=1} onClick={()=>setCards(c=>c.filter((_,i)=>i!==index))}>{pt?"Excluir":"Remove"}</button>
        </div>
      </article>)}
      <div className="is-edit-actions">
        <button type="button" disabled={cards.length>=100} onClick={()=>setCards(prev=>[...prev,{id:`user-${crypto.randomUUID()}`,front:"",back:"",concept:""}])}>
          + {pt?"Adicionar cartão":"Add card"}
        </button>
      </div>
      {error&&<p role="alert" className="is-edit-error">{error}</p>}
      <div className="is-edit-actions">
        <button className="is-edit-primary" type="button" disabled={busy} onClick={()=>void save()}>{busy?"Saving…":pt?"Salvar no Neon":"Save changes"}</button>
        <button type="button" onClick={()=>setOpen(false)}>{pt?"Cancelar":"Cancel"}</button>
      </div>
    </div>}
  </section>;
}
