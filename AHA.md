# AHA.md — InstantStudy™

> **Contrato de ativação do produto**  
> Versão: 1.0 | Data: 2026-10-12 | Estado: implementado em PR de desenvolvimento; **sem certificação E2E ou de produção**.  
> Repositório: `raphaelribeirob/InstantStudy` | Implementação: PR #51.  
> Documento técnico complementar: [docs/INSTANTSTUDY_FIRST_AHA.md](docs/INSTANTSTUDY_FIRST_AHA.md).

## 1. Tese

**O AHA do InstantStudy não é a IA criar flashcards. É o aluno perceber, com evidência, que conseguiu aprender melhor um conceito do próprio material.**

- **WOW (percepção inicial):** “Meu material se transformou em uma pergunta relevante.”
- **AHA — recuperação (preferencial):** “Eu errei, recebi uma explicação baseada no meu material e acertei um novo exercício sobre o mesmo conceito.”
- **AHA — domínio inicial (alternativo):** “O app verificou, por duas respostas em conceitos diferentes, o que já sei e orientou o próximo estudo.”
- **Retenção (não confundir com AHA):** o aluno volta, revisa no prazo e demonstra recordação em sessões posteriores.

Uma animação da Órbita, o carregamento de IA, a geração de cartões e a simples submissão de uma resposta **não contam** como aprendizado nem como `learning_aha_achieved`.

## 2. Restrição comercial inegociável

**Hard paywall permanece ativo.** Nenhuma chamada de estudo, avaliação, importação privada, armazenamento pessoal ou tutor premium pode ser liberada a quem não tiver acesso validado.

A landing pode oferecer explicações e **demonstrações fixas claramente identificadas como demonstração**. Ela não pode simular importação real nem armazenar conteúdo do aluno antes de autenticação e autorização.

A escolha da fonte na landing conduz a `/app?start=<source>`, preserva a intenção de importação e passa pelo `HardPaywallGate`. O material é selecionado e enviado **depois** da liberação da conta.

## 3. Jornada principal — primeira sessão

| Etapa | Ação do aluno | Resultado do produto | Evidência |
|---|---|---|---|
| 1. Entrada | Escolhe texto, PDF, Drive, áudio ou scan | Vai ao fluxo autenticado sem upload falso | `landing_import_intent` (marketing; não é AHA) |
| 2. Autorização | Entra e assina | Hard paywall verifica direito de acesso | Estado de acesso; não é AHA |
| 3. Importação | Salva material real | Material e assets são persistidos | `study_material_imported` |
| 4. Primeira pergunta | Abre Learn automaticamente | Backend prepara e interface apresenta a pergunta | `first_question_prepared` e `first_question_presented` |
| 5. Primeira tentativa | Responde | Backend corrige a resposta e atualiza a sessão | `first_answer_graded` |
| 6A. Lacuna | Tem resultado insuficiente | Explicação ligada ao material e novo exercício escrito do **mesmo conceito** | `learning_gap_detected` |
| 7A. Reteste | Demonstra melhora | Mostra nota anterior/atual sem afirmar retenção | `learning_gap_retested`; eventualmente `learning_aha_achieved` |
| 6B. Domínio | Acerta e responde outro conceito | Exibe domínio inicial, não uma falsa recuperação | Eventualmente `learning_aha_achieved` |
| 8. Continuidade | Prossegue | Oferece revisão espaçada e próximo conceito | Sessão e agendamento persistidos |

**Estados excepcionais:** se o aluno não aprende na segunda tentativa, o app permanece em modo de apoio, oferece outra explicação e estudo posterior; nunca apresenta AHA falso. Se pagamento, geração ou avaliação falhar, mostrar erro recuperável, sem sessão simulada.

## 4. Definição técnica do AHA (fonte única da verdade)

Apenas a modalidade `learn` pode gerar o AHA inicial. A decisão vem do backend, após o registro de tentativas avaliadas pelo Study Engine. O frontend apenas apresenta a evidência recebida.

### 4.1 Fórmula

`performance = 0.65 × correctness + 0.35 × completeness`

Os valores são números entre 0 e 1, derivados da avaliação. Guardar `confidence`, conteúdo de origem e tentativas separadamente; não enviar respostas ou conteúdo sensível ao analytics.

### 4.2 Recuperação do mesmo conceito

Gerar `learning_aha_achieved` com `variant=recovery` apenas quando:

1. Existe uma tentativa anterior **do mesmo conceito** com `performance < 0.65`.
2. O novo desempenho é `performance >= 0.82`.
3. A nova tentativa tem `completeness >= 0.75` e `confidence >= 0.80`.
4. A diferença entre desempenho anterior e atual é **>= 0.30**.
5. Ainda não foi concedido AHA de recuperação para esta sessão.
6. A sessão é real e persistida; não se aceita pontuação fornecida diretamente pelo navegador.

O ciclo após primeiro erro deve apresentar fonte e explicação e realizar ao menos um **reteste de resposta escrita**, não apenas reapresentar as mesmas alternativas. A prioridade é explicar e medir, não forçar aprovação.

### 4.3 Domínio inicial

Caso não tenha ocorrido uma recuperação:

1. Primeira e segunda respostas são de **conceitos diferentes**.
2. Ambas têm `performance >= 0.82` e `confidence >= 0.80`.
3. A última tem `completeness >= 0.75`.
4. Exibir `variant=demonstrated_mastery`.

Texto permitido: “Você demonstrou domínio inicial em dois conceitos.”  
Texto proibido: “Você aprendeu agora”, “Seu aprendizado aumentou X%”, se não houve melhora mensurada.

### 4.4 Limites científicos

Esse evento comprova **melhor desempenho avaliado durante uma sessão**, não aprendizagem causal, conhecimento duradouro ou retenção de longo prazo. A eficácia pedagógica depende de avaliações independentes e revisões futuras.

## 5. UX e Motion

- Uma única ação dominante por etapa; importar primeiro, estudar depois.
- Siri Orb comunica “ouvindo”, “avaliando” e “revisão” sem ocultar feedback essencial.
- Não usar animação de vitória antes da conclusão da correção no servidor.
- Painel de recuperação: **erro → explicação baseada no texto → botão de reteste**.
- Painel AHA: título conciso, indicador antes/depois somente quando disponível e convite para continuar.
- Transições respeitam `prefers-reduced-motion`, foco do teclado, leitores de tela e tamanhos mobile.
- Evitar pop-ups que interrompam a sequência de estudo, timers falsos e promessas de “nota máxima”.

## 6. Contrato de eventos PostHog

| Evento | Emissor | Significado exato |
|---|---|---|
| `landing_import_intent` | Landing (evento de marketing existente) | Clique na intenção; não houve upload |
| `study_material_imported` | Backend | Material real salvo |
| `first_question_prepared` | Backend | Primeira pergunta gerada; não significa que foi vista |
| `first_question_presented` | Cliente autenticado + backend | Interface informou a apresentação e backend aceitou sinal uma única vez |
| `first_answer_graded` | Backend | Primeira tentativa efetivamente avaliada |
| `learning_gap_detected` | Backend | Foi necessário reparar conceito |
| `learning_gap_retested` | Backend | Houve nova resposta após desempenho baixo no mesmo conceito |
| `learning_aha_achieved` | Backend | Critérios de 4.2 ou 4.3 cumpridos |

**Obrigatório:** eventos de aprendizado não devem ser produzidos a partir de cliques, mensagens renderizadas ou resultados que o navegador declarou por conta própria. A confirmação de `first_question_presented` é um reconhecimento da interface, não prova de leitura humana.

### Privacidade, LGPD e operação

- Captura desativada se faltarem `INSTANTSTUDY_POSTHOG_PROJECT_KEY` ou `INSTANTSTUDY_POSTHOG_ID_SALT` (segredo separado com pelo menos 32 caracteres).
- `INSTANTSTUDY_POSTHOG_HOST`: somente `https://us.i.posthog.com` ou `https://eu.i.posthog.com`.
- `distinct_id`: HMAC-SHA256 do ID de conta verificada; nunca email, nome ou ID bruto.
- Não registrar PDFs, texto do estudante, enunciados, respostas, IDs de materiais, tokens ou fontes privadas.
- Permitir somente propriedades não sensíveis: `mode`, `source_type`, `variant`, `attempt_number`, `elapsed_seconds`, `score_before`, `score_after`, `question_count`.
- Não habilitar autocapture nem session replay automaticamente. Definir base legal, política de privacidade, retenção e controles de acesso antes da coleta real.
- Falhas do PostHog não bloqueiam a avaliação nem mudam notas. A implementação atual usa envio opcional síncrono limitado por timeout; medir impacto e considerar fila confiável em fase posterior.

## 7. Indicadores de ativação

**North Star de ativação inicial:** proporção de novos assinantes que alcança `learning_aha_achieved` na sua primeira sessão de estudo em até 5 minutos após a primeira pergunta apresentada.

A primeira análise deve separar:

- **Funnel:** conta paga válida → material importado → pergunta apresentada → primeira resposta avaliada → reteste (quando aplicável) → AHA.
- **Tempo até valor:** mediana e P90 desde `first_question_presented` até `learning_aha_achieved`.
- **AHA por caminho:** `recovery` vs. `demonstrated_mastery`.
- **Desistência e erro:** por etapa, tipo de fonte, dispositivo e idioma, somente quando os atributos existirem de forma confiável.
- **Retenção:** retorno D1/D7 e execução de revisão espaçada. Não confundir ativação com retenção.

**Metas iniciais hipotéticas, a calibrar com coortes reais:** P50 primeira pergunta após importação <= 15s (texto curto); primeira resposta avaliada em <= 120s P50 incluindo tempo do aluno; AHA em <= 5 min para uma parcela significativa dos novos assinantes; medir base real antes de fixar alvo de conversão. Não apresentar essas metas como resultados medidos.

## 8. Critérios de aceite rastreáveis

### Implementação verificada por código/testes em branch (não equivale a produção)

- [x] Entrada da landing encaminha à autenticação e ao hard paywall, sem importação fictícia.
- [x] Conta paga sem biblioteca recebe um caminho direto de importação.
- [x] Importação concluída inicia `learn` sobre material real.
- [x] Erro inicial aciona explicação e reteste do mesmo conceito em modo escrito.
- [x] AHA é inferido de tentativas avaliadas e persistidas; não de cliques.
- [x] Um acerto inicial isolado não é classificado como melhoria.
- [x] Frontend distingue melhoria em reteste de domínio inicial.
- [x] Evento `first_question_presented` é validado por sessão e propriedade e registrado uma vez.
- [x] Tests e integração básica de eventos estão no PR #51.

### Aceite final pendente

- [ ] Teste E2E real com assinatura válida e assinatura inválida, desde landing até sessão.
- [ ] Dados reais de PostHog com envio, consentimento, filtros de privacidade e deduplicação inspecionados.
- [ ] Confirmação de latência, erros, acessibilidade e mobile em dispositivos reais.
- [ ] Avaliação independente da precisão da correção, sobretudo erros semânticos, negações e respostas equivalentes.
- [ ] Retenção D1/D7 e qualidade de revisão espaçada medidas com usuários.
- [ ] Branches e PRs de dependência integrados na ordem, CI verde e release assinada.

**Regra de release:** não declarar “AHA 100%”, “produto pronto” ou “aprendizado comprovado” enquanto qualquer item do aceite final não tiver evidência.

## 9. Mapa de implementação

| Responsabilidade | Arquivo principal |
|---|---|
| Contrato AHA e telemetria privada | `apps/mcp-server/src/ahaAnalytics.ts` |
| Testes das regras AHA | `apps/mcp-server/src/ahaAnalytics.test.ts` |
| Seleção/reteste, persistência e resultado | `apps/mcp-server/src/studyEngine.ts` |
| Testes de sessão e reteste | `apps/mcp-server/src/studyEngine.test.ts` |
| Emissão dos eventos após operação real | `apps/mcp-server/src/server.ts` |
| BFF e verificação de identidade | `apps/web/api/study.js` |
| Cliente de estudo e sinal de apresentação | `apps/web/src/study.ts` |
| Onboarding, recuperação e UI AHA | `apps/web/src/SoftwareApp.tsx` |
| Entrada na landing | `apps/web/src/App.tsx` |
| Regras visuais do primeiro estudo | `apps/web/src/software.css` |
| Critérios detalhados complementares | `docs/INSTANTSTUDY_FIRST_AHA.md` |

## 10. Relação com outras decisões

- Manter **Neon** como base de dados primária; nunca Firebase.
- Manter **hard paywall** com acesso verificado também na API.
- Preservar tipografia, Siri Orb, design Refero/ElevenLabs e Motion sem deixar a animação se tornar o AHA.
- Continuar internacionalização orientada pela oferta original, com testes pedagógicos separados por idioma.
- Não conflitar com a paridade de 48 requisitos com Quizlet: **AHA tem seus próprios critérios** e não certifica toda a oferta.
- Trabalhar no **GitHub** (branch + Pull Request + CI). Mudanças diretas em Vercel, Neon e produção não fazem parte deste contrato.

---

**Definição de sucesso:** o aluno consegue dizer *“o aplicativo detectou o que eu precisava aprender, explicou usando meu material, e eu demonstrei melhora numa resposta real”* — e os eventos registrados permitem verificar essa afirmação sem inventar aprendizado.
