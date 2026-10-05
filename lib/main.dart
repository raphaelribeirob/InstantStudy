import 'package:flutter/material.dart';

void main() => runApp(const InstantBibleApp());

abstract final class C {
  static const canvas = Color(0xFFFDFCFC);
  static const surface = Color(0xFFF5F3F1);
  static const border = Color(0xFFEBE8E4);
  static const ink = Color(0xFF000000);
  static const graphite = Color(0xFF44403B);
  static const muted = Color(0xFF777169);
  static const faint = Color(0xFFA59F97);
  static const blue = Color(0xFF0447FF);
  static const orange = Color(0xFFFF4704);
}

ThemeData theme() => ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: C.canvas,
  colorScheme: const ColorScheme.light(
    primary: C.ink,
    onPrimary: C.canvas,
    surface: C.canvas,
    onSurface: C.ink,
    outline: C.border,
  ),
  textTheme: const TextTheme(
    headlineLarge: TextStyle(fontSize: 36, height: 1.16, fontWeight: FontWeight.w300, letterSpacing: -0.7, color: C.ink),
    headlineMedium: TextStyle(fontSize: 30, height: 1.18, fontWeight: FontWeight.w300, color: C.ink),
    titleLarge: TextStyle(fontSize: 20, height: 1.4, fontWeight: FontWeight.w400, color: C.ink),
    titleMedium: TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w500, color: C.ink),
    bodyLarge: TextStyle(fontSize: 16, height: 1.55, fontWeight: FontWeight.w400, color: C.graphite),
    bodyMedium: TextStyle(fontSize: 14, height: 1.5, fontWeight: FontWeight.w400, color: C.muted),
    labelMedium: TextStyle(fontSize: 12, height: 1.3, fontWeight: FontWeight.w500, color: C.muted),
  ),
);

class InstantBibleApp extends StatefulWidget {
  const InstantBibleApp({super.key});
  @override
  State<InstantBibleApp> createState() => _InstantBibleAppState();
}

class _InstantBibleAppState extends State<InstantBibleApp> {
  int stage = 0;
  bool paid = false;
  bool complete = false;
  int tab = 0;
  String reflection = '';

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'InstantBible',
      debugShowCheckedModeBanner: false,
      theme: theme(),
      home: stage < 4
          ? Onboarding(stage: stage, onNext: () => setState(() => stage++))
          : !paid
              ? Paywall(onStart: () => setState(() => paid = true))
              : Shell(
                  tab: tab,
                  complete: complete,
                  reflection: reflection,
                  onTab: (value) => setState(() => tab = value),
                  onComplete: (value) => setState(() {
                    complete = true;
                    reflection = value;
                  }),
                ),
    );
  }
}

class Onboarding extends StatelessWidget {
  const Onboarding({super.key, required this.stage, required this.onNext});
  final int stage;
  final VoidCallback onNext;

  static const questions = [
    ['COMEÇANDO POR VOCÊ', 'O que você mais precisa nesta fase?', 'Paz · Direção · Disciplina · Propósito'],
    ['SEU RITMO', 'Como está sua constância com a Bíblia hoje?', 'Todos os dias · Às vezes · Raramente · Quero recomeçar'],
    ['UM MOMENTO POSSÍVEL', 'Quando cinco minutos de silêncio cabem melhor?', 'Ao acordar · No almoço · Fim da tarde · Antes de dormir'],
    ['VIDA REAL', 'Onde você quer aplicar mais sabedoria agora?', 'Trabalho · Relacionamentos · Ansiedade · Decisões'],
  ];

  @override
  Widget build(BuildContext context) {
    final q = questions[stage];
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Text('InstantBible', style: Theme.of(context).textTheme.titleMedium),
                    const Spacer(),
                    Text((stage + 1).toString() + '/4', style: Theme.of(context).textTheme.bodyMedium),
                  ]),
                  const SizedBox(height: 18),
                  Progress(value: (stage + 1) / 4),
                  const Spacer(),
                  Text(q[0], style: Theme.of(context).textTheme.labelMedium?.copyWith(letterSpacing: 1.4, color: C.faint)),
                  const SizedBox(height: 14),
                  Text(q[1], style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 30),
                  CardBox(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(q[2], style: Theme.of(context).textTheme.bodyLarge),
                        const SizedBox(height: 12),
                        Text('A personalização completa entra na próxima versão do onboarding.', style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Pill(label: stage == 3 ? 'Criar minha prática' : 'Continuar', onPressed: onNext),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Paywall extends StatelessWidget {
  const Paywall({super.key, required this.onStart});
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('INSTANTBIBLE+', style: Theme.of(context).textTheme.labelMedium?.copyWith(letterSpacing: 1.4)),
                  const SizedBox(height: 14),
                  Text('Transforme leitura em prática.', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 16),
                  Text('Um trecho, contexto suficiente para entender, uma ação concreta e uma reflexão curta — em cerca de cinco minutos.', style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 28),
                  const Benefit('Planos adaptados ao seu momento de vida'),
                  const Benefit('Prática diária guiada'),
                  const Benefit('Journal e histórico de reflexões'),
                  const Benefit('Explicações contextuais com guardrails'),
                  const SizedBox(height: 24),
                  CardBox(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ANUAL', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 16),
                        Text('R\$ 199,90 / ano', style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 6),
                        Text('3 dias grátis · cancele quando quiser', style: Theme.of(context).textTheme.bodyMedium),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Pill(label: 'Começar 3 dias grátis', onPressed: onStart),
                  const SizedBox(height: 10),
                  Center(child: Text('Protótipo: cobrança ainda não integrada.', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: C.faint))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Shell extends StatelessWidget {
  const Shell({
    super.key,
    required this.tab,
    required this.complete,
    required this.reflection,
    required this.onTab,
    required this.onComplete,
  });

  final int tab;
  final bool complete;
  final String reflection;
  final ValueChanged<int> onTab;
  final ValueChanged<String> onComplete;

  @override
  Widget build(BuildContext context) {
    final pages = [
      Today(complete: complete, reflection: reflection, onComplete: onComplete),
      const SimplePage(title: 'Planos', body: 'Jornadas curtas para ansiedade, decisões, relacionamentos e propósito.'),
      SimplePage(title: 'Journal', body: reflection.isEmpty ? 'Sua primeira reflexão aparecerá aqui.' : reflection),
      const SimplePage(title: 'Você', body: 'Preferências, horário da prática, assinatura e histórico.'),
    ];

    return Scaffold(
      body: IndexedStack(index: tab, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: onTab,
        backgroundColor: C.canvas,
        indicatorColor: C.surface,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.wb_sunny_outlined), label: 'Hoje'),
          NavigationDestination(icon: Icon(Icons.route_outlined), label: 'Planos'),
          NavigationDestination(icon: Icon(Icons.edit_note_outlined), label: 'Journal'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Você'),
        ],
      ),
    );
  }
}

class Today extends StatelessWidget {
  const Today({super.key, required this.complete, required this.reflection, required this.onComplete});
  final bool complete;
  final String reflection;
  final ValueChanged<String> onComplete;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 110),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('InstantBible', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 56),
                Text('HOJE', style: Theme.of(context).textTheme.labelMedium?.copyWith(letterSpacing: 1.4, color: C.faint)),
                const SizedBox(height: 12),
                Text(complete ? 'Leve isso com você.' : 'Cinco minutos. Uma prática.', style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 14),
                Text('Menos conteúdo. Mais presença. Hoje: presença antes da preocupação.', style: Theme.of(context).textTheme.bodyLarge),
                const SizedBox(height: 30),
                CardBox(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Mateus 6:34', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 24),
                      Text('Presença antes da preocupação', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 10),
                      Text('Um trecho. Um contexto. Uma ação concreta.', style: Theme.of(context).textTheme.bodyMedium),
                      const SizedBox(height: 24),
                      Pill(
                        label: complete ? 'Rever prática de hoje' : 'Começar prática de hoje',
                        onPressed: () async {
                          final result = await Navigator.of(context).push<String>(
                            MaterialPageRoute(builder: (_) => const Practice()),
                          );
                          if (result != null) onComplete(result);
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 34),
                Text('Seu caminho', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 14),
                const CardBox(child: Text('Ansiedade e presença · dia 4 de 7')),
                const SizedBox(height: 34),
                Text('Última reflexão', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 14),
                Text(reflection.isEmpty ? 'Sua próxima reflexão aparecerá aqui.' : reflection, style: Theme.of(context).textTheme.bodyLarge),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class Practice extends StatefulWidget {
  const Practice({super.key});
  @override
  State<Practice> createState() => _PracticeState();
}

class _PracticeState extends State<Practice> {
  int step = 0;
  final controller = TextEditingController();

  static const eyebrows = ['CHEGUE', 'ESCRITURA', 'ENTENDA', 'PRATIQUE', 'REFLITA'];
  static const titles = [
    'Antes de ler, diminua o ruído.',
    'Mateus 6:34',
    'O ponto não é prever amanhã.',
    'Torne isso concreto.',
    'O que você quer levar para o dia?',
  ];

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Widget content(BuildContext context) {
    switch (step) {
      case 0:
        return Text('Fique em silêncio por alguns segundos. Entregue a Deus aquilo que você está tentando resolver antes da hora.', style: Theme.of(context).textTheme.bodyLarge);
      case 1:
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('PARÁFRASE DEVOCIONAL', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 18),
          Text('“Não carregue o peso de amanhã antes da hora.”', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          Text('Texto demonstrativo. Uma tradução bíblica licenciada deve ser integrada em produção.', style: Theme.of(context).textTheme.bodyMedium),
        ]);
      case 2:
        return Text('Jesus direciona a atenção para o dia presente. A ideia não é ignorar responsabilidade, mas impedir que a preocupação futura ocupe o lugar da fidelidade possível hoje.', style: Theme.of(context).textTheme.bodyLarge);
      case 3:
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 10, height: 10, decoration: const BoxDecoration(color: C.orange, shape: BoxShape.circle)),
          const SizedBox(height: 18),
          Text('Escolha uma preocupação sobre amanhã. Escreva a próxima ação que realmente pode ser feita hoje — e faça somente essa.', style: Theme.of(context).textTheme.titleLarge),
        ]);
      default:
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('O que muda quando você troca a tentativa de controlar amanhã pela fidelidade no próximo passo de hoje?', style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 18),
          TextField(
            controller: controller,
            minLines: 4,
            maxLines: 7,
            decoration: const InputDecoration(
              filled: true,
              fillColor: C.canvas,
              hintText: 'Escreva algumas linhas. Só você verá isso.',
              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(16)), borderSide: BorderSide(color: C.border)),
            ),
          ),
        ]);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: C.canvas,
        elevation: 0,
        leading: IconButton(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.close)),
        title: Text((step + 1).toString() + ' de 5', style: Theme.of(context).textTheme.labelMedium),
      ),
      body: SafeArea(
        top: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              child: Column(
                children: [
                  Progress(value: (step + 1) / 5),
                  const SizedBox(height: 30),
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(eyebrows[step], style: Theme.of(context).textTheme.labelMedium?.copyWith(letterSpacing: 1.4, color: C.faint)),
                          const SizedBox(height: 12),
                          Text(titles[step], style: Theme.of(context).textTheme.headlineLarge),
                          const SizedBox(height: 28),
                          CardBox(child: content(context)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Pill(
                    label: step == 4 ? 'Concluir prática' : 'Continuar',
                    onPressed: () {
                      if (step == 4) {
                        Navigator.of(context).pop(controller.text.trim());
                      } else {
                        setState(() => step++);
                      }
                    },
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

class SimplePage extends StatelessWidget {
  const SimplePage({super.key, required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 16),
                Text(body, style: Theme.of(context).textTheme.bodyLarge),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class Benefit extends StatelessWidget {
  const Benefit(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: Row(
        children: [
          const Icon(Icons.check, size: 18, color: C.graphite),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyLarge)),
        ],
      ),
    );
  }
}

class CardBox extends StatelessWidget {
  const CardBox({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: C.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: C.border),
      ),
      child: child,
    );
  }
}

class Pill extends StatelessWidget {
  const Pill({super.key, required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: C.ink,
          foregroundColor: C.canvas,
          shape: const StadiumBorder(),
        ),
        child: Text(label),
      ),
    );
  }
}

class Progress extends StatelessWidget {
  const Progress({super.key, required this.value});
  final double value;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: value,
        minHeight: 3,
        backgroundColor: C.border,
        valueColor: const AlwaysStoppedAnimation(C.ink),
      ),
    );
  }
}
