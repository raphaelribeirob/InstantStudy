# APPLE_DESIGN.md — Auditoria Apple Developer Design do InstantStudy™

> **Auditoria de código e contrato de design para iPhone/iPad**  
> **Data:** 2026-10-12 · **Versão:** 1.0 · **Situação:** **NÃO APROVADO para submissão à App Store**  
> **Referência normativa:** Apple Human Interface Guidelines (HIG) e App Review Guidelines, consultadas em 12/10/2026.  
> **Escopo auditado:** Flutter iOS, Web/PWA com impactos na experiência mobile, paywall e design/motion; inclui diferenças entre branches abertas.  
> **Metodologia:** inspeção estática de arquivos do repositório + fontes oficiais da Apple. **Não houve execução em iPhone, Xcode, TestFlight, App Store Connect, dispositivos reais, análise de screenshots ou auditoria de contraste renderizado.**
>
> Este documento mede **alinhamento com as diretrizes da Apple**, não similaridade estética com os aplicativos nativos da Apple. A identidade editorial InstantStudy/Órbita deve continuar própria. Também não certifica a paridade dos 48 requisitos do Quizlet.

## 1. Resultado executivo

| Dimensão | Nota heurística / 10 | Julgamento |
|---|---:|---|
| Clareza visual e identidade | 7 | Boa tese editorial, identidade reconhecível |
| Navegação e foco de tarefa | 5 | Excesso de modos simultâneos e navegação nativa customizada |
| Tipografia e leitura | 4 | Muitos textos de 9–10 pt e fontes não claramente integradas |
| Dynamic Type e acessibilidade | 3 | Faltam testes de escala 200%, VoiceOver, foco e contraste |
| Motion e feedback | 6 | Redução de movimento presente em parte da base; PR #50 separado |
| Aparência claro/escuro | 3 | Tema nativo claro fixo; sem `ThemeMode.system` comprovado |
| Onboarding e primeiro valor | 5 | AHA elaborado em PR #51; splash ~1,6 s e validação real pendente |
| Paywall e fluxo de compra iOS | **1** | Bloqueio de lançamento: StoreKit/restauração ausentes; gate desativado por padrão |
| Prontidão da distribuição iOS | 2 | Não foram encontrados assets/configs nas localizações convencionais consultadas; nenhuma certificação Xcode/TestFlight |
| **Nota global** | **4/10** | Estimativa qualitativa, não nota atribuída pela Apple |

**Blue Ocean do design:** 3/10 — aparência premium é replicável; diferenciação defensável dependeria de aprendizagem demonstrável e UX superior.  
**Potencial de ROI:** indireto e indeterminado; melhorias de clareza, acesso e AHA podem favorecer conversão/retenção, mas faltam coortes pagas e testes.  
**Maior risco:** o produto iOS ainda não tem compra nativa certificada e seu gate de acesso está desabilitado no build padrão. **Não confundir** experiência bonita com aplicativo aceito pela App Store.

### Legenda de evidência

- **OBSERVADO NO CÓDIGO:** trecho verificável nas branches auditadas.
- **POTENCIAL RISCO:** sinal estático que precisa de confirmação visual/funcional.
- **NÃO VERIFICADO:** falta evidência para afirmar conformidade ou não conformidade.
- **P0 / bloqueante:** segurança/comércio e requisito fundamental antes de submissão.
- **P1:** experiência, acessibilidade e consistência; concluir antes da primeira versão pública.
- **P2:** polimento que pode seguir em release posterior, desde que não prejudique a acessibilidade.

## 2. Branches e rastreabilidade

| Código | Local / PR | Estado desta auditoria |
|---|---|---|
| Base do produto e proteção de assinaturas | `fix/instantstudy-neon-ownership-20261012` — [PR #49](https://github.com/raphaelribeirob/InstantStudy/pull/49) | Pendente de integração |
| Primeiro AHA e entrada guiada | `feat/instantstudy-first-aha-20261012` — [PR #51](https://github.com/raphaelribeirob/InstantStudy/pull/51) | Base desta auditoria |
| Motion editorial Web e Flutter | `feat/instantstudy-elevenlabs-motion-20261012` — [PR #50](https://github.com/raphaelribeirob/InstantStudy/pull/50) | **Branch paralela**, não presumir integrado ao PR #51 |
| Documento Apple Design | `audit/instantstudy-apple-design-20261012` | Somente documentação |

A `main` e a configuração instalada nos dispositivos não foram auditadas como uma release iOS atual. O código de PR pode não estar publicado.

## 3. Critérios oficiais Apple usados

1. **Design principles — clareza, familiaridade, consistência, privacidade e feedback:** https://developer.apple.com/design/human-interface-guidelines/design-principles/
2. **Accessibility — texto ampliado, tamanho e espaçamento de controles:** https://developer.apple.com/design/human-interface-guidelines/accessibility
3. **Tab bars — navegação entre seções de nível superior, não ações:** https://developer.apple.com/design/human-interface-guidelines/tab-bars
4. **Sidebars — navegação apropriada a telas grandes, adaptação a telas pequenas:** https://developer.apple.com/design/human-interface-guidelines/sidebars
5. **Layout — áreas seguras, diferentes dispositivos, textos ampliados:** https://developer.apple.com/design/human-interface-guidelines/layout
6. **Dark Mode — respeito à preferência do sistema:** https://developer.apple.com/design/human-interface-guidelines/dark-mode
7. **Color — cores semânticas, contraste e aparência:** https://developer.apple.com/design/human-interface-guidelines/color
8. **Motion — animação intencional, curta e opcional:** https://developer.apple.com/design/human-interface-guidelines/motion
9. **Launching e Onboarding — abrir rapidamente e ensinar no contexto:** https://developer.apple.com/design/human-interface-guidelines/launching ; https://developer.apple.com/design/human-interface-guidelines/onboarding
10. **App icons — tamanho, variantes e identificação:** https://developer.apple.com/design/human-interface-guidelines/app-icons
11. **Materials / Liquid Glass — separar navegação/controles do conteúdo:** https://developer.apple.com/design/human-interface-guidelines/materials
12. **Feedback — status, erros, voz e háptica acessíveis:** https://developer.apple.com/design/human-interface-guidelines/feedback
13. **App Review Guidelines, seção 3.1 — pagamentos e assinaturas; 4.8 — login de terceiros quando aplicável:** https://developer.apple.com/app-store/review/guidelines/br/
14. **StoreKit — restauração de compras:** https://developer.apple.com/documentation/storekit/restoring-purchased-products
15. **Gerenciamento e exclusão de conta:** https://developer.apple.com/design/human-interface-guidelines/managing-accounts

As diretrizes oferecem princípios e valores recomendados; **nem toda recomendação é uma causa automática de rejeição**. Conformidade App Review depende do produto final, metadados, país, tipo de conta, plano e exceções que realmente se apliquem.

## 4. Matriz de achados — Apple HIG × InstantStudy

| ID | Área | Situação observada / evidência | Severidade | Critério de aprovação |
|---|---|---|---|---|
| APPLE-P0-01 | IAP e StoreKit | `apps/flutter_app/lib/native_hard_paywall.dart` diz que compra nativa e restauração não estão configuradas; `pubspec.yaml` não declara plugin de StoreKit/IAP | **P0** | Assinar, renovar, cancelar, recuperar, restaurar, falhar e revogar via StoreKit + backend; validar em sandbox e TestFlight |
| APPLE-P0-02 | Hard paywall nativo | `apps/flutter_app/lib/main.dart` define `_nativePaywallEnabled` com `defaultValue: false`; o caminho alternativo monta `StudyHome` | **P0** | Build distribuível bloqueia estudo pago por padrão e não depende de flag para fail-closed; nenhum acesso após expiração |
| APPLE-P0-03 | Detalhes da assinatura | Tela nativa atual somente informa indisponibilidade; não oferece produtos, preços locais, renovação, links e ações completas | **P0** | Preço, periodicidade, condições, renovação, política e restaurar compras apresentados antes da compra; produtos reais da App Store |
| APPLE-P0-04 | Conta/deleção | Não identifiquei fluxo de exclusão nem Sign in with Apple nos arquivos Flutter examinados; a obrigação depende de como o app cria/autentica contas | **P0 condicional** | Se permite criar conta, oferecer exclusão; se usa login social para conta principal, oferecer opção equivalente conforme 4.8 e suas exceções |
| APPLE-P0-05 | Empacotamento iOS | Não encontrei `ios/Runner/Info.plist`, `ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json` nem `LaunchImage.imageset/Contents.json` na branch auditada | **P0 de verificação** | Confirmar projeto iOS compilável, bundle ID, permissões, ícone e tela de lançamento no Xcode; ausência nestes caminhos não prova ausência em outro lugar |
| APPLE-P1-01 | Tamanho de texto | `main.dart` e `orbital_home.dart` exibem diversos rótulos de 9–10 pt e corpo de 12–14 pt | **P1** | Padrão de texto confortável (~17 pt no corpo, com variações apropriadas); rótulos menores testados em tamanhos ampliados e com VoiceOver |
| APPLE-P1-02 | Dynamic Type | Há muitos estilos fixos; não foram comprovados layouts estáveis com texto de até 200% | **P1** | Sem clipping, truncamento importante, overflow ou ação oculta em 100/135/200%, incluindo landscape/iPad |
| APPLE-P1-03 | Targets de toque | `_ModeRail` usa minHeight 46, porém outros elementos são densos (rótulos 9 pt, chips compactos). Tamanho efetivo não medido | **P1** | Alvos principais de cerca de 44×44 pt ou maiores, espaçamento/área invisível suficientes; acertar sem toques acidentais |
| APPLE-P1-04 | Navegação | `OrbitalHome` lista 12 modos e `main.dart` muda `_nativePanel` dentro de uma tela customizada | **P1** | Separar 3–5 áreas principais conforme necessidade, modos dentro da área “Estudar”, ações contextuais no toolbar; back previsível e estado preservado |
| APPLE-P1-05 | Aparência | `MaterialApp` tem apenas `ThemeData`/ `ColorScheme.light`; não há `darkTheme` ou `themeMode: ThemeMode.system` nos arquivos auditados | **P1** | Testar modo claro/escuro do sistema e contraste aumentado, com cores adaptativas; não impor Liquid Glass no conteúdo |
| APPLE-P1-06 | Fonte | Tema usa `fontFamily: 'Inter'`, mas `pubspec.yaml` só registra fonte LeagueSpartan | **P1** | Resolver/fixar licenças e assets da fonte de corpo, ou adotar fonte do sistema para UI; League Spartan apenas em títulos/branding |
| APPLE-P1-07 | Acessibilidade semântica | Poucas ocorrências de `Semantics` no `main.dart` e `orbital_home.dart`; labels de Orb/painéis e anúncio de resultados exigem verificação | **P1** | VoiceOver lê corretamente propósito, estado selecionado, erro, nota e próximo passo; rotor/foco/ordem testados |
| APPLE-P1-08 | Splash e ativação | `study_splash_intro.dart` usa `AnimationController` de 1600ms e permite redução/skip; fluxo pode atrasar primeiro valor | **P1** | Launch screen do sistema quase idêntica à primeira tela; animação de marca pós-launch curta, cancelável, sem bloquear repetidamente |
| APPLE-P1-09 | Motion nativo | PR #50 introduz tokens e transições; branch-base auditada ainda contém durações 180/320/460ms independentes | **P1** | Consolidar tokens, reduzir movimento em TODAS as animações, VoiceOver e teste visual; status do PR #50 não é conformidade automática |
| APPLE-P1-10 | Safe areas e teclado | `StudyHome` usa `SafeArea` e rolagem; testes de teclado/sheet/landscape não foram encontrados | **P1** | iPhone com notch/Dynamic Island, indicador Home, teclado aberto, iPad split view/rotação; botão primário sempre alcançável |
| APPLE-P1-11 | Erros e status de IA | Existem mensagens de erro e estados de processamento; ausência de validação de VoiceOver/háptica | **P1** | Carregamento, erro e sucesso comunicados via texto, região semântica e foco; háptica discreta opcional |
| APPLE-P1-12 | Priorização de conteúdo | Siri/Órbita é visualmente dominante na home e há múltiplas escolhas antes do primeiro estudo | **P1** | CTA “Importar material”/“Continuar aprendendo” perceptível sem navegação exploratória; AHA medido com alunos |
| APPLE-P1-13 | Privacidade | Arquivos/notas/áudio e PostHog exigem disclosure; não foi auditada a ficha App Privacy de App Store Connect | **P1** | Coleta mínima, permissões no contexto, consentimento/retenção e declaração de uso de dados alinhados ao código |
| APPLE-P1-14 | App Icon e Liquid Glass | Não houve validação de catálogo iOS e variantes iconográficas; Liquid Glass não precisa ser copiado em conteúdo | **P1** | Ícone base 1024×1024, variantes sistêmicas adequadas e legibilidade; testar ícones em modo claro, escuro, tinted/clear |
| APPLE-P2-01 | Feedback háptico | Uso intencional de háptica para seleção e sucesso AHA não comprovado | **P2** | Háptica apenas para ações significativas, respeitando usuário e feedback sem cor exclusiva |
| APPLE-P2-02 | Polimento iPad | Não identifiquei uma adaptação com sidebar nativa comprovada, multijanela ou layouts grandes testados | **P2** | Aproveitar largura de iPad, sem aumentar vazio nem escalar simplesmente UI de iPhone |
| APPLE-P2-03 | Identidade editorial | Órbita e tipografia são fortes, mas podem consumir mais atenção que material/pergunta | **P2** | Conteúdo domina foco, Orb fica contextual; referências ElevenLabs não copiam ativos de terceiros |

## 5. Investigação aprofundada por tela

### A. Entrada / splash

**Observado:** `StudySplashIntro` tem animação InstantStudy→IStudy de aproximadamente 1,6s, respeita `MediaQuery.disableAnimations` e oferece Skip em parte do código. O conteúdo base pode aparecer apenas após essa etapa.

**Condição Apple:** launch screen deve transicionar imediatamente para primeira tela; onboarding opcional contextual acontece depois. A marca pode existir, mas não deve transformar cada abertura em espera.

**Aceite:** 10 aberturas em iPhones diferentes (frio/morno), Reduce Motion ligado, VoiceOver, tela inicial comparada ao launch screen, tempo até conteúdo interativo medido P50/P95.

### B. Home/Órbita

**Observado:** `orbital_home.dart` contém pelo menos doze ações: Review, Learn, Quiz, Test, Ask, Flashcards, Guide, Podcast, Insights, Game, Friends e Library. É uma composição original, mas cria competição pela atenção.

**Proposta para testar (não imposta pela Apple):** três destinos top-level — **Estudar**, **Biblioteca**, **Progresso** — e uma ação principal **Importar/Continuar**. Learn, Test, Ask, Flashcards e Review tornam-se submodos contextuais, sem perder a Órbita como identidade.

**Aceite:** novo aluno importa e responde uma questão sem procurar menus; usuário recorrente retoma a revisão; botão Voltar preserva sessão; VoiceOver identifica a área e o estado selecionado.

### C. Importar material

**Observado:** Flutter possui importação de texto/arquivos e o AHA Web conduz à primeira pergunta, mas não há evidência de testes iOS com todas as fontes.

**Condição Apple:** usar File Picker/Photos/microfone de forma contextual, sem pedir permissões antecipadas; permitir cancelar, corrigir erro, retomar e remover material importado.

**Aceite:** arquivo texto/PDF/imagem/áudio — happy path, permissão negada, falha de rede, arquivo grande, armazenamento esgotado, sessão expirada. Dados privados nunca vazarão por tela ou logs.

### D. Learn / Ask / Test / Cards

**Observado:** Study Engine e interface de estudo estão implementados parcialmente nas branches. Navegação e feedback nativos são majoritariamente customizados.

**Condição Apple:** hierarquia visual da pergunta domina; opções recebem alvos adequados; teclado não cobre controles; estados são acessíveis sem depender apenas de vermelho/verde; Ask permanece legível ao ampliar texto.

**Aceite:** VoiceOver percorre pergunta→opções→verificar→feedback→próxima questão; reteste mostra diferença de score real; correção não é proclamada antes da resposta do servidor.

### E. Assinatura

**Observado:** `NativeHardPaywall` comunica que não há compra configurada, sem botões de StoreKit; `_StartupGate` monta estudo sem paywall no padrão `false`.

**Condição de negócio e revisão:** para vender acesso digital no app distribuído na App Store, o padrão é usar In-App Purchase/StoreKit, respeitadas exceções e regras regionais aplicáveis. O Paddle Web não substitui automaticamente essa obrigação. É obrigatório avaliar o enquadramento jurídico/comercial exato, com App Review, em vez de assumir um link externo permitido.

**Aceite:** exibir moeda/valor/taxa/período da loja, termos/privacidade, ações “Assinar” e “Restaurar compras”, gerenciar/entender renovação; sucesso só libera após validação server-side de transação, sem perda do estado entre dispositivos.

### F. Ajustes, privacidade e suporte

**Não verificado:** interface nativa para exclusão de conta, gerenciamento de assinatura, políticas, permissão de áudio/fotos, preferências de notificações e acesso a suporte.

**Aceite:** usuário encontra controles sem recorrer ao site de marketing. Caso o app crie contas, oferecer exclusão acessível no próprio app ou conforme política válida; não confundir “sair” com “excluir”.

## 6. Contrato de design recomendado

### Tokens de leitura e acessibilidade

| Elemento | Padrão de trabalho sugerido | Observação |
|---|---|---|
| Texto principal | ~17 pt, escalável conforme sistema | Referência de legibilidade Apple, não imposição de única medida |
| Secundário | 13–15 pt quando legível e escalável | Evitar corpo textual em 9–10 pt |
| Labels e metadados | Buscar 11–13 pt no mínimo | Revisar contraste e amplitude de escala |
| Título de tela | Aproximadamente 28–34 pt, respeitando Dynamic Type | Títulos grandes podem quebrar em 2 linhas |
| Ação primária | Área tocável em torno de 44×44 pt ou maior | Área interativa importa mais que ícone visual |
| Densidade | Uma ação primária por tela | Controles secundários agrupados por contexto |
| Ícones | SF Symbols equivalentes onde possível; consistência semântica | Flutter Material Icons não são automaticamente proibidos |
| Cores | Semânticas, com light/dark/high contrast | Contraste real deve ser medido |
| Motion | Microinterações breves, opcional para reduzido | Não atrasar correção, login ou pagamento |
| Safe area | Padding de tela + teclado + dispositivos | Validar em Simulator e iPhone físico |
| Orb | Presença contextual, com estado descrito em texto/semântica | Nunca única fonte de informação |

**Tipografia da marca:** League Spartan 400 pode ficar na identidade/títulos. Para corpos longos e componentes nativos, usar fonte do sistema ou Inter devidamente declarada/licenciada e com escala validada.

### Layout de referência iPhone (hipótese para teste)

```text
Safe Area + título curto e estado atual
┌─────────────────────────────┐
│ Estudar            Perfil   │
├─────────────────────────────┤
│ Órbita (tamanho contextual) │
│                             │
│ Seu próximo passo           │
│ Revisar 4 conceitos         │
│ [Continuar estudando]       │
│                             │
│ Materiais recentes          │
│ Biologia | História         │
│                             │
├─────────────────────────────┤
│ Estudar | Biblioteca | Progr.│
└─────────────────────────────┘
Safe Area / Home Indicator
```

Isto é proposta de UX, **não** representação fiel de screenshot nem template obrigatório da Apple. O iPad pode trocar a tab bar por sidebar adaptativa se houver ganho de usabilidade.

## 7. Testes de aceite — design iOS

| ID | Cenário | Resultado exigido |
|---|---|---|
| IOS-DES-01 | iPhone menor suportado, vertical | Sem clipping, overflow ou CTA invisível |
| IOS-DES-02 | iPhone com Dynamic Island e Home Indicator | Nenhum controle em área insegura |
| IOS-DES-03 | iPad vertical/horizontal e multitarefa | Navegação adaptável sem alongamento inútil |
| IOS-DES-04 | Dynamic Type 100%, 135%, 200% | Texto essencial legível; navegação funcional |
| IOS-DES-05 | VoiceOver e teclado externo | Ordem de foco lógica, seleção/erro/anúncios corretos |
| IOS-DES-06 | Reduce Motion e menor desempenho gráfico | Sem motion espacial obrigatório ou atraso artificial |
| IOS-DES-07 | Light, Dark, Increase Contrast | Legibilidade comprovada por inspeção e contraste medido |
| IOS-DES-08 | Entrar, assinar, restaurar, expirar, reembolsar | StoreKit sandbox + entitlement correto, nenhum bypass |
| IOS-DES-09 | Fechar/reabrir app no paywall e pós-compra | Estado seguro, sem dados de outra conta |
| IOS-DES-10 | PDF/imagem/áudio; permissões negadas | Tratamento claro, cancelável, sem falsos sucessos |
| IOS-DES-11 | Questão, reteste, AHA e feedback | Correção real, resultado acessível, progresso durável |
| IOS-DES-12 | Launch, splash, app icon, metadados | Verificado em Xcode/TestFlight/App Store Connect |
| IOS-DES-13 | Excluir conta se houver cadastro | Fluxo acessível com revogação e política de dados |
| IOS-DES-14 | Captura de privacidade e App Privacy | Declarações consistentes com coleta real e consentimento |
| IOS-DES-15 | WCAG equivalente e auditoria HIG manual | Contraste, telas, ações e leitores assistivos aprovados |

### Matriz de prova obrigatória (por caso)

```yaml
apple_design_requirement: IOS-DES-04
apple_official_reference: https://developer.apple.com/design/human-interface-guidelines/accessibility
git_sha: "<release candidate sha>"
platform: iOS
ios_version: "<version>"
device: "<simulator + physical device>"
text_size: "<system setting>"
evidence: "<screenshot / video / XCTest result / report>"
expected: "<explicit pass threshold>"
actual: "<observed behavior>"
reviewer: "<independent reviewer>"
decision: "pass | fail"
```

Não aprovar apenas por existência do widget ou screenshot único de simulador.

## 8. Plano de correções (GitHub-first)

**Fase 0 — Integridade da cadeia:** consolidar PR #49, #50 e #51 em branch integrada, sem conflitos, e manter a `main` intocada até verificações. Motion do PR #50 deve ser reavaliado ao ser integrado.

**Fase 1 — P0 App Store:** substituir o placeholder por produtos StoreKit 2 (ou integração Flutter apropriada), restaurar compras, validar transações no servidor e amarrar direitos à conta. Tornar o hard paywall nativo efetivamente fail-closed. Verificar projeto iOS, bundle, Info.plist e ícone.

**Fase 2 — Tipografia/acessibilidade:** auditar textos menores que 11pt, custom fonts, Dynamic Type até 200%, hit targets, contraste, VoiceOver, foco, erros e ação primária.

**Fase 3 — Navegação:** prototipar navegação menos carregada mantendo Órbita; utilizar padrões de tab bar, toolbar, sheet e sidebar onde tragam vantagem; não copiar Liquid Glass como textura indiscriminada.

**Fase 4 — Motion & aparência:** consolidar tokens do PR #50, respeitar Reduce Motion, introduzir cores adaptativas e garantir ícones em aparências Apple atuais.

**Fase 5 — Certificação iOS:** Xcode compile/archive, TestFlight, simulações de assinatura/cancelamento, revisão de permissões, acessibilidade, screenshots/metadata e checklist IOS-DES-01..15.

## 9. Relação com requisitos existentes

- `AHA.md` — definição de primeiro valor real, distinta de animação de abertura.
- `engenharia reversa.md` — 48 critérios da oferta Quizlet e suas dependências.
- `docs/INSTANTSTUDY_MOTION.md` — contrato de motion **na branch do PR #50**.
- `docs/HARDWALL_E2E_ACCEPTANCE.md` — testes de assinatura e autorização.
- `docs/quizlet-parity.manifest.json` — inventário funcional (não aceito 100%).

**Apple HIG ≠ App Review aprovado ≠ paridade Quizlet ≠ produção publicada.** Exigir quatro aceites distintos.

## 10. Decisão final da auditoria

**Não aprovado para declarar conformidade Apple 100% e não recomendado submeter o binário iOS atual.**

**Primeira correção obrigatória:** compra nativa e hard paywall efetivamente fechado.  
**Segunda:** Dynamic Type, semântica/VoiceOver e leitura confortável.  
**Terceira:** fluxo de navegação iPhone, adaptação iPad, dark mode e motion consistente.  
**Quarta:** App Store Connect/TestFlight, asset catalog, privacidade, screenshots e prova E2E.

O InstantStudy pode manter visual Refero/ElevenLabs e Siri Orb como expressão própria; a Apple não exige que o produto pareça um app nativo específico. Exige experiência intuitiva, acessível, segura e processos de compra conformes.

---

**Escopo desta entrega:** documento de auditoria e checklist criados no GitHub. **Nenhum código funcional, banco de dados, Vercel, App Store Connect ou ambiente de produção foi alterado.**
