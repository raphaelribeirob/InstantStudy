# Engenharia reversa — InstantStudy™

> **Contrato de engenharia reversa de produto, UX, IA, arquitetura e critérios de aceite**  
> Data-base: 12/10/2026 · Versão: 1.0 · Benchmark funcional: Quizlet · Produto independente: InstantStudy™  
> Escopo: Web/PWA, Flutter iOS/Android e MCP · Situação: **não certificado** · Trabalho: **GitHub exclusivamente**  
> Fonte de verdade da paridade: [docs/quizlet-parity.manifest.json](docs/quizlet-parity.manifest.json); alterações deste arquivo não certificam implementação.

## 1. Objetivo e fronteiras

Reproduzir **capacidades e resultados de aprendizagem** observáveis na oferta pública do Quizlet, reinterpretando-os como experiência própria do InstantStudy: uma interface orbital focada em importar material, ensinar, questionar, corrigir, revisar e demonstrar progresso real.

**O objetivo não é clonar o Quizlet visualmente nem copiar implementação proprietária.** Engenharia reversa significa decompor oferta, jornadas, regras de produto e resultados verificáveis para projetar uma solução independente.

- **Referência de capacidade:** Quizlet (páginas públicas e central de ajuda).
- **Referência estética do InstantStudy:** design editorial definido em Refero/ElevenLabs, Siri Orb e Motion. Não copiar assets, marcas, animações proprietárias, textos de interface ou componentes fechados.
- **Critério de êxito:** alcançar resultados equivalentes para os casos de uso declarados, com testes independentes, observabilidade e isolamento de usuários.
- **Não permitido:** obter código privado, desrespeitar controles de acesso, contornar pagamento, copiar bases de conteúdo sem licença, usar dados privados de terceiros ou promover paridade sem evidência.
- **Status de referência:** o manifesto registra 48 requisitos: 18 parciais, 16 ausentes, 8 bloqueados e 6 implementados sem aceite; certificados: 0. Classificações são do repositório, não auditoria em produção.
- **Prioridade:** 27 requisitos P0, 17 P1 e 4 P2; o lançamento exige cumprir todos os P0 aplicáveis e a meta de paridade integral exige aceite dos 48.

## 2. Fontes de evidência e hierarquia

| Nível | Fonte | Pode provar | Não prova |
|---|---|---|---|
| E1 | Página/ajuda oficial do Quizlet | Função prometida, fluxo descrito, limites explícitos | Código interno, algoritmo exato, economia interna |
| E2 | Comportamento observado em conta de teste legítima, com captura e data | UX, saídas, edge cases testados | Regra universal ou infraestrutura interna |
| E3 | Código, testes e documentação do InstantStudy | Implementação candidata, contratos, testes automatizados | Deploy, eficácia de aprendizado e usabilidade real |
| E4 | Sandbox, dispositivo real, registros de produção autorizados | Funcionamento de integrações na configuração testada | Confiabilidade futura sem monitoramento |
| E5 | Avaliações de usuários e comunidade | Hipóteses de problema e fricção | Prevalência estatística representativa |

**Não afirmar “mesmo algoritmo”, “100% igual”, “mesma IA” ou “mesmo motion”.** Apenas o resultado comportamental pode ser comparado com uma amostra controlada, e deve ser descrito como *equivalência funcional* com ressalvas.

### Fontes públicas canônicas consultadas

- [Quizlet 101 — jornada principal](https://quizlet.com/content/quizlet101)
- [Study Modes — Learn, Flashcards, Test, Match e Live](https://quizlet.com/features/study-modes)
- [Learn — prática adaptativa e sincronização](https://quizlet.com/features/learn)
- [Ask Quizlet — tutor contextual](https://quizlet.com/features/ask-quizlet)
- [Ajuda oficial — Ask Quizlet](https://help.quizlet.com/hc/en-us/articles/42790350723725-Studying-with-Ask-Quizlet)
- [Audio Recording — de aula para materiais](https://quizlet.com/features/audio-recording)
- [Blocks](https://quizlet.com/features/blocks) e [Blast](https://quizlet.com/features/blast-single-player)
- [Quizlet para professores](https://quizlet.com/teachers)

Rever datas, região, permissões e oferta comercial antes de afirmar paridade: algumas capacidades são liberadas por plataforma, idade, plano ou país. Não inferir 100% a partir de páginas de marketing.

## 3. Tese do produto e diferenças intencionais

> **InstantStudy transforma qualquer material autorizado em uma sequência mensurável de entendimento, prática, correção e retenção.**

| Dimensão | Benchmark Quizlet | Decisão InstantStudy |
|---|---|---|
| Organização | Flashcard sets e ferramentas adjacentes | Material original como fonte única, sessões orbitais e ferramentas derivadas |
| Primeiro valor | Encontrar/criar set e iniciar modo de estudo | Importar → primeira pergunta → erro explicado → reteste/valor comprovável |
| Assistência | Ask Quizlet e geração de materiais | Tutor contextual ligado às fontes; respostas não viram fatos sem checagem |
| Adaptação | Learn, cartões, testes, revisão | Study Engine próprio, aprendizagem ativa, política por conceito, FSRS |
| Monetização | Política do benchmark varia | **Hard paywall obrigatório**, sem estudo gratuito |
| Interface | UX proprietária Quizlet | Siri Orb + Refero/ElevenLabs-inspired Motion e tipografia própria |
| Persistência | Serviço do benchmark não acessível | **Neon PostgreSQL como único banco primário** |
| Plataformas | Web e apps | Web/PWA, Flutter iOS/Android e MCP com OAuth individual pendente |
| Internacionalização | Oferta anunciada de 17 idiomas | Alvo: 17 idiomas / 19 variantes, com qualidade pedagógica testada |

### Princípios que não devem ser negociados para perseguir “paridade”

1. Não liberar recursos pagos sem entitlement validado no servidor.
2. Não mostrar resposta correta como se fosse conhecimento do aluno.
3. Não produzir melhora falsa, sessão simulada, pontuação inventada ou alegações de retenção não medida.
4. Não criar “nova fonte” com alucinação da IA: guardar procedência e distinguir inferência de documento.
5. Não armazenar conteúdo privado em cache compartilhado entre contas.
6. Não colocar chaves de IA, Neon, Paddle ou PostHog no cliente.
7. Não contar interface animada como entrega da funcionalidade.

## 4. Engenharia reversa por jornada (contratos de produto)

### J1. Primeira visita e assinatura

**Entrada:** aluno visita a landing, escolhe formato e prossegue.  
**Execução esperada:** a escolha da fonte abre `/app?start=<tipo>`; autenticação + hard paywall validam a assinatura; o material só é capturado após autorização.  
**Saída verificável:** aluno pago entra no primeiro importador. Anônimo, conta sem assinatura, cancelado e expirado ficam bloqueados também nas APIs.  
**Evidência:** testes reais de login, assinatura, webhooks e revogação; CI isolado não basta.

### J2. Importação e geração

**Entrada:** texto, documento, imagem, áudio ou origem privada autorizada.  
**Execução:** normalizar fonte, extrair, detectar idioma, identificar conceitos, gerar resumo, estrutura, flashcards e questões associados a trechos confiáveis. Para arquivos, preservar erros e rastreabilidade.  
**Saída:** material persistido e recuperável, editável e capaz de iniciar estudo.  
**Casos adversos:** arquivo vazio, malicioso, enorme, corrompido, conteúdo OCR incerto, idiomas mistos, limites de provedor, falta de permissão Drive. Não inventar texto quando OCR falhar.

### J3. Primeiro AHA

**Entrada:** material do aluno, primeira pergunta, resposta e avaliação.  
**Execução:** se uma tentativa for fraca, explicar usando a fonte, propor reteste escrito do mesmo conceito e recalcular domínio com resposta real. Se a primeira resposta for boa, pedir outro conceito e distinguir domínio inicial de melhora.  
**Saída:** `learning_aha_achieved` somente sob os critérios objetivos de [AHA.md](AHA.md).  
**Proibição:** animação, clique ou conteúdo gerado não qualificam AHA.

### J4. Learn e Test

**Learn:** questões progressivas (alternativa, escrita, recordação, aplicação), atualização de domínio e repetição de conceitos fracos; evidência de justificativa.  
**Test:** tipos configuráveis, temporizador opcional, respostas protegidas até fim, nota calculada a partir de tentativas reais; não revelar gabarito antecipadamente.  
**Aceite:** acertos/erros parciais testados, respostas contraditórias e negações corretamente tratadas, distratores pertinentes, desempenho medido por coorte e idioma.

### J5. Flashcards, Ask e revisão

**Flashcards:** virar, embaralhar, marcar “Já sei”/“Ainda aprendendo”, editar, duplicar, importar/exportar CSV sem perdas; estado por conta.  
**Ask:** responder de forma fundamentada e progressiva, continuar o diálogo, propor questões; qualquer set salvo deve manter rastreabilidade.  
**Revisão:** FSRS/agenda por conceito, filas devidas persistidas, regras para estados expirados e consistência entre dispositivos; sincronização móvel verificável.

### J6. Áudio, jogos, grupos e professores

**Áudio:** gravação/transcrição, guia e podcast fundamentados, TTS localizado, velocidade, pausar/retomar e comportamento em segundo plano.  
**Jogos:** Match, Blast, Blocks e modo colaborativo com física/pontuação própria e equivalência funcional, não cópia de artes originais.  
**Social/educador:** equipes, convites, permissões de compartilhamento, sala de aula, tarefas, relatórios e revogação de acesso, sempre com consentimento de menores quando aplicável.

### J7. Global First e acesso multiplataforma

**Idiomas:** interface, classificação de respostas, OCR, voz, formatação numérica, fuso e acessibilidade por locale.  
**Web/Flutter:** manter equivalência dos fluxos principais, compras e restauração nativas verificadas.  
**MCP:** OAuth2 por aluno e escopos estritos; nunca dar acesso pago a múltiplas contas por uma única chave compartilhada.

## 5. Arquitetura alvo (contrato, não declaração de infraestrutura pronta)

```mermaid
flowchart TD
  L[Landing e escolha da fonte] --> P[Conta autenticada e Hard Paywall]
  P -->|Entitlement verificado| UI[Web PWA / Flutter / MCP OAuth]
  UI --> BFF[BFF de estudo e identidade]
  BFF --> API[API Study Engine]
  API --> ING[Ingestão e extração de fontes]
  API --> ORCH[Orquestração IA com limites]
  ORCH --> SET[Guia Flashcards Ask Test]
  API --> GRADE[Correção fundamentada]
  GRADE --> POLICY[Política adaptativa e FSRS]
  POLICY --> NEON[(Neon PostgreSQL)]
  ING --> NEON
  SET --> NEON
  BFF --> PAY[Instant Pay / lifecycle verificado]
  API --> EVT[Telemetria privada AHA]
  EVT --> PH[PostHog opt-in]
  ```

### Limites de responsabilidade

| Camada | Responsabilidade | Evidência de qualidade |
|---|---|---|
| Frontend | UX, acessibilidade, Motion, foco, estado de UI | Playwright + dispositivo + redução de movimento |
| BFF | Validar sessão e encaminhar identidade/credenciais sem vazamento | Testes 401/403/402, expiração, troca de conta e HMAC |
| Study API | Contrato de sessão, progresso, rejeição de acesso externo | Unit/integration + contract tests |
| Ingestão | Extração e procedência dos materiais | Amostras anotadas de documentos reais licenciados |
| LLM Router | Roteamento, quotas, retry, modelos e custo | Benchmarks qualidade, latência P95, failover e custo |
| Avaliador | Correção semântica e determinística, feedback da fonte | Dataset adversarial com gold labels, análise de falsos positivos |
| FSRS/Neon | Durabilidade, propriedade, migração, consistência | Testes com restart, múltiplos clientes e backup/restore |
| Pagamento | Cobrar, renovar, pausar, cancelar, reembolsar, restaurar | Sandbox Paddle e recibos StoreKit/Google Play reais |
| PostHog | Funil de ativação e retenção sem dados sensíveis | Consentimento, entrega, deduplicação e auditoria de payload |
| MCP | App ChatGPT e clientes compatíveis com OAuth por aluno | OAuth, escopos, revogação, bloqueio de usuários não pagos |

### Padrão de agentes pedagógicos

Não criar “um agente por página” sem ganho real. Separar **responsabilidades e critérios**:

1. **Source Interpreter:** identifica conceitos e cita a origem; nunca eleva resposta gerada a fato.
2. **Study Planner:** seleciona primeiro conceito e objetivo, com prioridade a dificuldade e tempo disponível.
3. **Question Designer:** gera variedade de questões e verifica plausibilidade dos distratores.
4. **Grader:** avalia com fonte, explica incerteza, captura confidência e recusa afirmar domínio quando não comprovado.
5. **Recovery Coach:** fornece explicação curta e reteste do mesmo conceito.
6. **Retention Scheduler:** atualiza FSRS e agenda próximos itens usando tentativas reais.
7. **Quality Sentinel:** mede vazamento de respostas, hallucinations, cotas, latência e inconsistência pedagógica.

**Orquestração:** usar funções determinísticas e contratos JSON onde possível; chamar LLM apenas nas tarefas que necessitem compreensão ou geração; executar verificações independentes nos pontos de alto risco. Agentes não podem contornar paywall nem escrever notas arbitrárias no banco.

## 6. Matriz de engenharia reversa — 48 critérios

**Esta seção é um retrato do manifesto existente, não uma nova auditoria.** Cada entrada lista prioridade, status declarado, arquivo candidato e teste de aceite. Verificação completa exige ticket, cenário, log/evidência, versão e data.

| ID | Capacidade | Prioridade | Status manifesto | Evidência de código indicada | Aceite exigido |
|---|---|---|---|---|---|
| `BILL-01` | Hard paywall on all learning surfaces | P0 | Parcial | `apps/web/api/_hardPaywall.js` | Entitlement required before access; 401/402 to unpaid; zero free learning |
| `BILL-02` | Payment ownership, lifecycle and revocation | P0 | Parcial | `docs/HARDWALL_E2E_ACCEPTANCE.md` | Real Paddle sandbox and App Store/Play receipts, renew/refund/expiry/restore verified |
| `BILL-03` | MCP and direct API per-user paid authorization | P0 | Bloqueado | `apps/mcp-server/src/hardPaywallSignature.ts` | OAuth user-bound, signed authorization; no shared-bearer bypass |
| `BILL-04` | Teacher/institution sponsored paid seats | P1 | Ausente | `apps/pay/api/entitlements.js` | A sponsoring paid institution grants revocable guest entitlements without freemium |
| `ING-01` | Text, TXT, Markdown, CSV | P0 | Implementado, sem aceite | `apps/mcp-server/src/ingest.ts` | Real files imported; text persisted and reloadable |
| `ING-02` | PDF, DOCX, PPTX import | P0 | Implementado, sem aceite | `apps/mcp-server/src/ingest.ts` | Tables, headings, slides, equations and citations sampled across languages |
| `ING-03` | Photo, handwritten notes and diagrams OCR | P0 | Bloqueado | `apps/mcp-server/src/ingest.ts` | Real provider credentials and accuracy benchmark; legible math preserved |
| `ING-04` | Lecture recording, upload and transcription | P0 | Bloqueado | `apps/mcp-server/src/ingest.ts` | Length limits, speaker transcripts and latency measured in each supported locale |
| `ING-05` | Private Google Drive and native file selection | P0 | Bloqueado | `apps/web/src/googleDrivePicker.ts` | Scoped OAuth on web and both mobile platforms with private documents |
| `ING-06` | Large files with durable object storage | P1 | Parcial | `apps/mcp-server/src/largeAudioUpload.ts` | Authenticated chunking, object lifecycle, retry, no binary blob in Neon |
| `SETS-01` | Source-grounded guides, summaries and outlines | P0 | Parcial | `apps/mcp-server/src/studyAssetIntelligence.ts` | Human-rated fidelity >=95% on reference sources; citations and no invented claims |
| `SETS-02` | Generated and manually created study sets | P0 | Parcial | `apps/web/src/MaterialEditor.tsx` | Can create from topic, paste and blank deck; save without source file |
| `SETS-03` | Edit, duplicate, import/export and reorder flashcards | P0 | Parcial | `apps/web/src/MaterialEditor.tsx` | Edit and persist term/definition and set metadata, export/import round-trip |
| `SETS-04` | Images, audio, equations and diagrams on cards | P1 | Ausente | `apps/web/src/SoftwareApp.tsx` | Accessible media cards and interactive diagram hotspots with persisted coordinates |
| `SETS-05` | Folders, favorites, labels, browse and permissions | P1 | Parcial | `apps/mcp-server/src/materialStore.ts` | Search, folder hierarchy, favorites and least-privilege set sharing |
| `SETS-06` | Know vs Still learning, shuffle and flip | P0 | Parcial | `apps/web/src/SoftwareApp.tsx` | Persistent classifications and correct study queues, both card directions |
| `LEARN-01` | Adaptive Learn multiple choice and written | P0 | Implementado, sem aceite | `apps/mcp-server/src/studyEngine.ts` | Wrong/right answers update mastery and question policy |
| `LEARN-02` | Spell and Write modes with audio | P0 | Ausente | `apps/mcp-server/src/studyEngine.ts` | Hear prompt, type answer, accepted variants, accents and localized phonetics |
| `LEARN-03` | Repair weak concepts and mastery | P0 | Implementado, sem aceite | `apps/mcp-server/src/studyEngine.ts` | Re-test only from actual answered questions; no fabricated mastery |
| `LEARN-04` | Practice Test configurable types, timer, grading | P0 | Parcial | `apps/mcp-server/src/studyEngine.ts` | MC, T/F, matching, written; final answer reveal, score and weaknesses |
| `LEARN-05` | Answer-quality calibration and sources | P0 | Parcial | `apps/mcp-server/src/questionGenerator.ts` | No fabricated distractors; correct answer explainable from cited source |
| `ASK-01` | Multi-turn contextual tutoring and step-by-step help | P0 | Parcial | `apps/mcp-server/src/learningIntelligence.ts` | Conversation history per learner; provenance; challenge questions |
| `ASK-02` | Convert Ask threads to saved sets and next practice | P0 | Ausente | `apps/mcp-server/src/materialStore.ts` | Grounded generated set stored and user can start Learn/Test from Ask |
| `REVIEW-01` | FSRS due scheduling, offline-safe state and review | P0 | Parcial | `apps/mcp-server/src/studyPersistence.ts` | Durable due queue and multi-device consistency measured over longitudinal scenarios |
| `REVIEW-02` | Insights, weak concepts, streak, charms | P0 | Implementado, sem aceite | `apps/mcp-server/src/offerLayer.ts` | Metrics recomputed from real graded sessions rather than UI counters |
| `AUDIO-01` | Guided audio and podcast from source | P1 | Parcial | `apps/mcp-server/src/offerLayer.ts` | Two-speaker grounded script with stop/resume and readable transcript |
| `AUDIO-02` | Locale-valid TTS, playback speed and background | P1 | Ausente | `apps/flutter_app/lib/main.dart` | Voice intelligibility measured per locale, media controls on devices |
| `GAME-01` | Match with accuracy, timed scores | P1 | Parcial | `apps/mcp-server/src/offerLayer.ts` | Real source pairs, time, best score, restart |
| `GAME-02` | Blast equivalent asteroid gameplay | P1 | Ausente | `apps/web/src/SoftwareApp.tsx` | Moving correct/incorrect answer targets, reaction, scoring and accessibility |
| `GAME-03` | Blocks equivalent puzzling gameplay | P1 | Ausente | `apps/web/src/SoftwareApp.tsx` | Correct answers unlock documented puzzle moves and deterministic score |
| `GAME-04` | Quizlet Live equivalent team classroom mode | P1 | Ausente | `apps/mcp-server/src/studyRoomStore.ts` | Host/join, team collaboration, question validation and race to win |
| `SOCIAL-01` | Study groups, shared sets and progress | P1 | Parcial | `apps/mcp-server/src/studyRoomStore.ts` | Members share only authorized content, see independent progress and group weaknesses |
| `SOCIAL-02` | Family independent accounts and seats | P1 | Parcial | `apps/pay/api/family.js` | Real owner seat checkout, inheritance and instant server-side revocation |
| `TEACH-01` | Teacher classes and assignments | P1 | Ausente | `apps/mcp-server/src/studyRoomStore.ts` | Create class, enroll authorized users, assign Learn/Test and due dates |
| `TEACH-02` | Class progress and exportable reports | P1 | Ausente | `apps/mcp-server/src/studyEngine.ts` | Completion and mastery from real sessions, per-class permissions |
| `TEACH-03` | Google Classroom connection | P2 | Ausente | `apps/web/src/googleDrivePicker.ts` | Scope-limited OAuth assignment sharing/import with revoked-token tests |
| `CATALOG-01` | Discover/search shared public sets | P2 | Ausente | `apps/mcp-server/src/materialStore.ts` | Search/index/report/takedown, licensing and moderation workflows |
| `CATALOG-02` | Expert-verified step-by-step textbook solutions | P2 | Bloqueado | `docs/OFFER.md` | Licensed verified content with chapter/question catalog and source rights |
| `CATALOG-03` | Community contributions and abuse moderation | P2 | Ausente | `docs/OFFER.md` | Creator permissions, reporting, copyright requests and privacy safeguards |
| `OFFLINE-01` | Encrypted offline mobile study | P1 | Ausente | `apps/flutter_app/lib/main.dart` | After authorized download, Study works offline with bounded signed access |
| `OFFLINE-02` | Offline edits and conflict reconciliation | P1 | Ausente | `apps/flutter_app/lib/main.dart` | No lost updates across two devices and network recovery; revocation eventually enforced |
| `GLOBAL-01` | All offer languages translated | P0 | Parcial | `apps/web/src/i18n.ts` | 17 offer languages with 19 regional locales; complete source strings, no English leakage |
| `GLOBAL-02` | Per-locale teaching, grading, voice and OCR | P0 | Bloqueado | `apps/mcp-server/src/studyAssetIntelligence.ts` | Real pedagogical evaluation for each locale and independently chosen study language |
| `GLOBAL-03` | Native purchase/local money/data formatting | P0 | Ausente | `apps/web/src/App.tsx` | Intl currencies, app stores, locale RTL-safe layout, region-specific policies |
| `OPS-01` | Neon exclusively as primary database | P0 | Implementado, sem aceite | `apps/mcp-server/src/databasePolicy.ts` | Migration and readiness in actual production; no legacy database SDK or in-memory production fallback |
| `OPS-02` | Production Web/API same release and healthy | P0 | Bloqueado | `docs/HARDWALL_E2E_ACCEPTANCE.md` | Deployment sha, ready health, live smoke and logs aligned; no preview-only false release |
| `OPS-03` | Security OWASP, privacy, A11y, load and recovery | P0 | Parcial | `docs/HARDWALL_E2E_ACCEPTANCE.md` | OWASP ZAP live + device E2E + auth tests + WCAG AA + SLO sampled |
| `OPS-04` | Plugin OAuth per learner and correct paid access | P1 | Bloqueado | `docs/AGENT_CONNECTIONS.md` | Public MCP OAuth2 with PKCE scopes, no shared token bypass |

### Internacionalização — escopo do manifesto

Os 17 idiomas anunciados e 19 variantes regionais são alvos. “Tradução de interface” não equivale a “modelo pedagógico localizado”.

| Código | Idioma | Variantes-alvo | UI no manifesto | Ensino/avaliação |
|---|---|---|---|---|
| `en` | English | `en-US`, `en-001` | Parcial | unverified |
| `nl` | Dutch | `nl` | Ausente | unverified |
| `fr` | French | `fr-FR`, `fr-CA` | Ausente | unverified |
| `de` | German | `de` | Ausente | unverified |
| `id` | Indonesian | `id` | Ausente | unverified |
| `it` | Italian | `it` | Ausente | unverified |
| `ja` | Japanese | `ja` | Ausente | unverified |
| `ko` | Korean | `ko` | Ausente | unverified |
| `pl` | Polish | `pl` | Ausente | unverified |
| `pt` | Portuguese | `pt-BR` | Parcial | unverified |
| `ru` | Russian | `ru` | Ausente | unverified |
| `zh-Hans` | Simplified Chinese | `zh-Hans` | Ausente | unverified |
| `es` | Spanish | `es` | Ausente | unverified |
| `zh-Hant` | Traditional Chinese | `zh-Hant` | Ausente | unverified |
| `tr` | Turkish | `tr` | Ausente | unverified |
| `uk` | Ukrainian | `uk` | Ausente | unverified |
| `vi` | Vietnamese | `vi` | Ausente | unverified |

**Atenção ao estado atual:** o manifesto é um backlog e pode estar desatualizado em relação às branches #49/#50/#51. Quando um recurso avançar (por exemplo, editor CSV, salvamento de Ask ou AHA), adicionar a evidência exata e só então atualizar o status; não usar `verified` sem E2E.

## 7. Design, marca e Motion (engenharia de linguagem visual)

Referência visual autorizada: [Refero](https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26) e inspiração editorial de ElevenLabs; referência de componente orbital: [Siri Orb / SmoothUI](https://smoothui.dev/docs/components/siri-orb).

**Diretrizes do InstantStudy:**
- Preservar marca InstantStudy™ e tipografia League Spartan Regular 400 na identidade aprovada; validar licença de fontes e de dependências.
- Abertura InstantStudy™ → IStudy™, sem inventar uma segunda marca dentro do estudo.
- Motion padronizado: rápido 160ms, padrão 240ms, deliberado 340ms, revelação 420ms; transições de opacidade/deslocamento curto, nunca sobrepor controles focáveis.
- A Siri Orb é indicador de estado e presença, **não substituto dos controles acessíveis**.
- Suportar `prefers-reduced-motion` e configurações nativas de redução de animação, teclado, leitor de telas e toque.
- Garantir que a saída de um painel de paywall não mantenha controles acessíveis indevidamente.
- Não afirmar equivalência visual pixel a pixel com ElevenLabs; teste de referência deve ser de consistência interna.

Contrato complementar: [docs/INSTANTSTUDY_MOTION.md](docs/INSTANTSTUDY_MOTION.md) — na branch de Motion; [PR #50](https://github.com/raphaelribeirob/InstantStudy/pull/50).

## 8. Auditoria de reclamações negativas (hipóteses de experiência)

Reclamações recorrentes de produtos de estudo são insumos de risco, **não uma amostra estatística sem pesquisa de base**. Converter cada hipótese em benchmark, teste e evento:

| Hipótese de reclamação | Como o InstantStudy deve responder | Teste negativo |
|---|---|---|
| Paywall pouco claro e assinatura surpreendente | Transparência de preço, renovação, limites e cancelamento antes de comprar; manter hard paywall | Cancelamento/reembolso/expiração sem acesso indevido |
| Correção semântica injusta | Benchmark de equivalência, negações, sinônimos e erros parciais; revisão/contestação | “não” invertendo gabarito não recebe nota alta |
| Alternativas óbvias e questões repetidas | Distratores plausíveis e diversidade por conceito | Repetição indevida ou resposta explícita não passa |
| Perda de cartões e edições | Persistência real, import/export reversível e histórico confiável | Troca de dispositivo e refresh preservam material |
| Lentidão na primeira experiência | Perfil P50/P95 de importação e avaliação, cancelamento e erros claros | Upload lento não fica carregando indefinidamente |
| Conteúdo privado entre contas | Isolamento de sessões, materiais e cache | Aluno B não enxerga dados do aluno A |
| Offline falso | Mostrar claramente recursos disponíveis sem conexão | Sem internet não exibir “sincronizado” se não foi |
| Áudio sem controle | Pausar, retomar, velocidade, acessibilidade e idioma | Reprodução não deve continuar indevidamente |
| Bugs após atualização | Visual + E2E + métricas de regressão por release | CI verde sozinho não certifica dispositivo |

## 9. Ferramentas open source — lacunas, não decisões de instalação

O registro de candidatos está em [docs/OPEN_SOURCE_GAP_REGISTER.md](docs/OPEN_SOURCE_GAP_REGISTER.md). Cada candidato exige validação de licença, manutenção, security advisories, preço operacional, integração e sandbox.

| Lacuna | Opção para investigar | Gate obrigatório |
|---|---|---|
| OCR manuscrito/multilíngue | PaddleOCR | Precisão por locale, matemática, CPU/memória, privacidade |
| Editor de material rico | Tiptap | Licença, acessibilidade, persistência e Flutter |
| Processo de traduções | Weblate | Licença AGPL e integração com revisão humana |
| Content library | OpenStax/OER com licença por obra | Copyright, atribuição, comercialidade e takedown |
| LLM provider fallback | Router existente | Nota pedagógica, custo, falhas e cotas por idioma |

Não instalar repositórios por número de estrelas. Ter biblioteca open source não prova paridade com a oferta do Quizlet.

## 10. Política de testes e evidências para 100%

### Dataset mínimo controlado

- Materiais próprios/licenciados: texto, PDF com tabelas, slide, DOCX, imagens, fórmulas, nota manuscrita e áudio.
- Variação de disciplina: idiomas, história, matemática, biologia, medicina, concursos e temas livres.
- Benchmark de respostas com **verdade de referência**: correta, parcialmente correta, negação, sinônimo, confusão conceitual, pergunta mal formulada e conteúdo ausente da fonte.
- Todos os 17 idiomas com casos de gênero, acentuação, script e voz quando disponível.
- Personas: aluno novo, assinante ativo, expirado, familiar, professor e conta cruzada.
- Dispositivos: desktop, mobile Web, iOS e Android, incluindo movimento reduzido.

### Pipeline de certificação

```text
Requisito oficial datado
   ↓
Hipótese e critérios de aceite reproduzíveis
   ↓
Issue + implementação com commits
   ↓
Testes de unidade, contrato, integração e segurança
   ↓
Playwright e dispositivo real / pagamentos sandbox
   ↓
Evidência vinculada ao SHA, locale e ambiente
   ↓
Revisor independente marca VERIFIED no manifesto
   ↓
Gate geral de release (48/48 + gates transversais)
```

Comandos disponíveis no repositório:
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run security:audit`
- `npm run audit:database`
- `npm run audit:parity`
- `npm run audit:neon-live` (necessita credencial de ambiente apropriado)
- `npm run audit:release` (deve **falhar** até certificação de todos os requisitos)

Regras: `audit:parity` verifica o inventário, não concede aprovação. Um CI verde não certifica integração real de Paddle, Neon, assinaturas de lojas, OAuth MCP nem eficácia pedagógica.

### Evidências por requisito

Para declarar qualquer `verified`, registrar:
```yaml
id: LEARN-03
benchmark_url: https://quizlet.com/features/learn
observed_at: YYYY-MM-DD
implementation_ref: <git-commit-sha>
test_case: <file-or-check-id>
environment: <preview-or-production-version>
locale: <locale-tested>
device: <device-tested>
actual_result: <measured-assertion>
reviewer: <independent-reviewer>
status: verified
```

Não incluir tokens, dados de alunos ou credenciais em evidências.

## 11. Ordem de execução — foco no caminho crítico

### P0-A. Base de release confiável
Consolidar PRs em ordem: segurança e funcionalidade [#49](https://github.com/raphaelribeirob/InstantStudy/pull/49), Motion [#50](https://github.com/raphaelribeirob/InstantStudy/pull/50) e AHA [#51](https://github.com/raphaelribeirob/InstantStudy/pull/51), resolvendo conflitos em uma branch candidata única. Exigir CI, diffs revisados e rastreabilidade. **Não fazer merge cego na main.**

### P0-B. Paywall + dados + identidade
Revisar autenticação, HMAC, isolamento, restauração e migrações; integrar compras na sandbox real; estabelecer revogação segura e OAuth do plugin. Não alterar Neon/Vercel por trabalho de documentação.

### P0-C. Núcleo de aprendizagem e AHA
Certificar importação, fontes, primeira pergunta, correção, reteste e FSRS. Testar frases contraditórias e qualidade de distratores antes de chamar o fluxo de sucesso.

### P1. Completar paridade visível
Edição rica, modos Spell/Write, áudio, podcasts, jogos, compartilhamento, professores e offline.

### P1/P2. Global e catálogo
Idioma não é somente arquivo `i18n`: validar ensino, OCR, TTS e dados. Construir catálogo público somente com licença/moderação.

### Release
Exigir os 48 requisitos aceitos, além de testes de pagamento, privacidade, segurança dinâmica, WCAG, carga, observabilidade, recuperação e atualização mobile.

## 12. Indicadores de produto e economia

| Métrica | Como medir | Uso |
|---|---|---|
| AHA dos novos assinantes | `learning_aha_achieved` / novos assinantes com primeiro estudo | Primeiro valor real |
| Time-to-first-question | Entre importação salva e pergunta de fato apresentada | Fricção |
| Erro → melhora | Reteste com score superior, mesma fonte/conceito | Qualidade pedagógica |
| Retenção D1/D7/D30 | Sessão e respostas reais após primeira sessão | Utilidade recorrente |
| Correção contestada | Reclamação/falso positivo por n avaliações auditadas | Confiança |
| CAC, conversão e cancelamento | Eventos de marketing, aquisição, cobrança e coortes | Economia de assinatura |
| Custo/estudo | Tokens + OCR + áudio + storage + infra, por usuário ativo | Margem |
| P50/P95 latência/erro | Importação, geração, avaliação e TTS | Escalabilidade |

**ROI:** não projetar receita a partir do benchmark; estimar apenas com CAC, conversão paga, churn, LTV, processamento médio por assinante, taxas e reembolsos medidos. Hard paywall aumenta a necessidade de clareza comercial e diminui possibilidade de “experimentar antes de pagar”.

## 13. Riscos, conformidade e bloqueios

| Risco | Prioridade | Mitigação |
|---|---|---|
| Assinatura cobrada sem acesso | P0 | Sandbox ponta a ponta, webhook idempotente, restauração |
| Usuário indevido acessando estudo pago | P0 | Fail-closed em Web/API/MCP, testes entre contas |
| Resposta falsa marcada correta | P0 | Benchmark adversarial + revisão pedagógica |
| Fonte privada vazada | P0 | Menor privilégio, URL/SSRF protections, cache isolado |
| Claims de paridade não comprovados | P0 | Matriz 48 com estado e evidência obrigatória |
| Falta de estoque de conteúdo público licenciado | P1 | Licenças e moderação antes de indexar |
| Elevado custo de IA e áudio | P1 | Quotas, fallback, custo/estudo e limites por assinatura |
| Motion interferindo no acesso e na acessibilidade | P1 | WCAG, reduced-motion e testes reais |
| Offline com revogação atrasada | P1 | Tokens limitados, sincronização e prazo de expiração |

## 14. Decisão formal

- **Oferta de referência:** Quizlet (funcional, não visual ou intelectual).
- **Diferenciação InstantStudy:** UI orbital, tutor integrado, recuperação real do aprendizado e fontes do aluno.
- **Hard paywall:** mantido.
- **Banco primário:** Neon PostgreSQL.
- **Internacionalização-alvo:** 17 idiomas / 19 variantes.
- **MCP:** ativo somente com autorização individual segura; nunca substituir por credencial compartilhada no rollout pago.
- **Documentos complementares:** [AHA.md](AHA.md), [docs/INSTANTSTUDY_FIRST_AHA.md](docs/INSTANTSTUDY_FIRST_AHA.md), [docs/quizlet-parity.manifest.json](docs/quizlet-parity.manifest.json), [docs/HARDWALL_E2E_ACCEPTANCE.md](docs/HARDWALL_E2E_ACCEPTANCE.md).
- **Regra de desenvolvimento solicitada:** editar **somente GitHub**; Vercel, Neon e produção não são alterados diretamente.
- **Veredito atual:** `NOT_CERTIFIED`. Este documento especifica o caminho para 100%, mas não constitui prova de sua conclusão.

---

**Princípio final:** engenharia reversa bem-sucedida não é listar recursos parecidos. É demonstrar, para cada promessa da oferta, que um aluno real consegue obter o mesmo tipo de resultado, com dados, segurança, pagamento e testes reproduzíveis.
