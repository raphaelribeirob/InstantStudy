# LAB ONLY — GitHub `raphaelribeirob`

> **Status: ambiente de testes. Não usar como origem de produção.**

Este repositório pertence ao laboratório R3. Código e artefatos daqui são experimentais, mesmo quando estão na branch `main` ou quando a Vercel apresenta um target chamado `production`.

## Regras obrigatórias

1. Usar somente dados sintéticos ou explicitamente autorizados para testes; não conectar segredos, credenciais de produção ou dados reais de clientes.
2. Usar branches `feature/*`, `test/*` ou `qa/*` e deployments **Preview** para testes. `main` não é uma autorização para publicar produção.
3. Não realizar `vercel --prod`, `vercel promote`, aliases ou ligações a domínios de produção a partir deste laboratório.
4. Desabilitar envios reais para clientes, cobranças reais, integrações financeiras e mensagens WhatsApp/SMS/e-mail em massa, salvo sandbox formalmente isolado.
5. Antes de transferir uma versão para produção: testes automatizados, segurança, revisão de segredos, QA, acessibilidade e aprovação explícita; publicar em **outra conta/repositório e outro projeto de hospedagem**.
6. Não tratar endpoints `*.vercel.app` ou deployments existentes como produção homologada; a Vercel R3 é somente um ambiente de teste.

## Controles de plataforma

Na equipe Vercel R3, o **Ignored Build Step** foi configurado para pular automaticamente builds Git cujo `VERCEL_ENV=production`, enquanto builds de Preview podem prosseguir. Os deployments estão protegidos por autenticação Vercel.

**Limite:** o Ignored Build Step não é um bloqueio absoluto de publicação: `vercel.json`, deploys manuais e permissões de administração podem sobrepor controles. Nunca conceder a este laboratório credenciais ou domínios de produção. Revisar esses controles periodicamente.

**Política estabelecida:** 2026-10-17.
