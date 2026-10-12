import 'package:flutter/material.dart';

/// Deliberately disabled in production until StoreKit/Google Play Billing,
/// server receipt verification and restore-purchases are operational.
/// Never redirect iOS/Android users to a web checkout for in-app study content.
class NativeHardPaywall extends StatelessWidget {
  const NativeHardPaywall({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFC),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('InstantStudy™', style: TextStyle(
                    color: Colors.black,
                    fontFamily: 'LeagueSpartan',
                    fontWeight: FontWeight.w400,
                    fontSize: 25,
                  )),
                  const SizedBox(height: 48),
                  const Text('ESTUDE COM A ÓRBITA', style: TextStyle(
                    color: Color(0xFF777169),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 1.5,
                  )),
                  const SizedBox(height: 16),
                  const Text('Aprenda com o que você já tem.',
                      style: TextStyle(fontSize: 39, height: 1.1,
                        letterSpacing: -1.1, fontWeight: FontWeight.w300)),
                  const SizedBox(height: 18),
                  const Text(
                    'Importe materiais, pratique com perguntas adaptativas e revise seus conhecimentos.',
                    style: TextStyle(fontSize: 15, height: 1.5,
                      color: Color(0xFF44403B)),
                  ),
                  const SizedBox(height: 36),
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F3F1),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ACESSO POR ASSINATURA',
                          style: TextStyle(letterSpacing: 1.2, fontSize: 10)),
                        SizedBox(height: 10),
                        Text('Assinaturas nativas ainda não estão configuradas.',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                        SizedBox(height: 8),
                        Text(
                          'O acesso será liberado somente após a verificação de uma compra válida pela loja do dispositivo. Nenhuma cobrança será iniciada nesta tela.',
                          style: TextStyle(fontSize: 13, height: 1.5),
                        ),
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
