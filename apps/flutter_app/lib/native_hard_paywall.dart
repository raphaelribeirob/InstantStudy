import 'package:flutter/material.dart';

/// Paid native access is fail-closed until the app authenticates the learner,
/// validates StoreKit/Play Billing transactions server-side, and supports
/// restoration/revocation. Do not add a fake Subscribe button or web checkout.
class NativeHardPaywall extends StatelessWidget {
  const NativeHardPaywall({super.key});

  @override
  Widget build(BuildContext context) {
    final pt = Localizations.localeOf(context).languageCode == 'pt';
    final colors = Theme.of(context).colorScheme;
    final heading = pt ? 'Aprenda com o que você já tem.' : 'Learn from what you already have.';
    final body = pt
        ? 'Importe materiais, pratique com perguntas adaptativas e revise seus conhecimentos.'
        : 'Import your material, practice adaptive questions, and review what you learn.';
    final message = pt
        ? 'Assinaturas no aplicativo estão temporariamente indisponíveis.'
        : 'In-app subscriptions are temporarily unavailable.';
    final detail = pt
        ? 'A compra e a restauração serão liberadas somente após a validação segura pela loja e pela sua conta. Não há cobrança nesta tela.'
        : 'Purchases and restoration will be offered only when we can securely verify the store transaction and your account. This screen cannot charge you.';
    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text('InstantStudy™', style: TextStyle(
                      color: colors.onSurface,
                      fontFamily: 'LeagueSpartan',
                      fontWeight: FontWeight.w400,
                      fontSize: 28,
                    )),
                  ),
                  const SizedBox(height: 38),
                  Text(pt ? 'ESTUDE COM A ÓRBITA' : 'STUDY WITH YOUR ORBIT',
                    style: TextStyle(
                      color: colors.onSurfaceVariant,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.1,
                    )),
                  const SizedBox(height: 12),
                  Semantics(
                    header: true,
                    child: Text(heading, style: TextStyle(
                      fontSize: 34,
                      height: 1.18,
                      letterSpacing: -.7,
                      fontWeight: FontWeight.w400,
                      color: colors.onSurface,
                    )),
                  ),
                  const SizedBox(height: 18),
                  Text(body, style: TextStyle(
                    fontSize: 17,
                    height: 1.5,
                    color: colors.onSurface,
                  )),
                  const SizedBox(height: 30),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: colors.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(pt ? 'ACESSO POR ASSINATURA' : 'SUBSCRIPTION ACCESS',
                          style: TextStyle(color: colors.onSurfaceVariant,
                            letterSpacing: 1, fontSize: 13,
                            fontWeight: FontWeight.w600)),
                        const SizedBox(height: 12),
                        Text(message, style: TextStyle(
                          fontSize: 18,
                          color: colors.onSurface,
                          fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        Text(detail, style: TextStyle(
                          fontSize: 15,
                          height: 1.5,
                          color: colors.onSurfaceVariant,
                        )),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
