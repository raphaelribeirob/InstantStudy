import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Native Flutter interpretation of DESIGN.md v3 Refero/SmoothUI Orbital OS.
/// SmoothUI's original React SiriOrb is used on Web, not embedded in Flutter.
class OrbitalHome extends StatelessWidget {
  const OrbitalHome({
    super.key,
    required this.materialTitle,
    required this.hasMaterial,
    required this.onAction,
  });

  final String? materialTitle;
  final bool hasMaterial;
  final ValueChanged<String> onAction;

  static const Color ink = Color(0xFF000000);
  static const Color eggshell = Color(0xFFFDFCFC);
  static const Color taupe = Color(0xFFF5F3F1);
  static const Color stone = Color(0xFFEBE8E4);
  static const Color graphite = Color(0xFF44403B);
  static const Color smoke = Color(0xFF777169);

  @override
  Widget build(BuildContext context) {
    final pt = Localizations.localeOf(context).languageCode == 'pt';
    String tr(String portuguese, String english) => pt ? portuguese : english;
    final modes = <_OrbitMode>[
      _OrbitMode('review', Icons.refresh_rounded, tr('Revisar', 'Review'), tr('Memória no momento certo', 'Right-time recall')),
      _OrbitMode('learn', Icons.psychology_outlined, tr('Aprender', 'Learn'), tr('Prática adaptativa', 'Adaptive practice')),
      _OrbitMode('quiz', Icons.quiz_outlined, 'Quiz', tr('Perguntas rápidas', 'Quick questions')),
      _OrbitMode('test', Icons.school_outlined, tr('Simulado', 'Practice test'), tr('Avaliação estruturada', 'Structured assessment')),
      _OrbitMode('ask', Icons.forum_outlined, tr('Perguntar', 'Ask'), tr('Explique minhas dúvidas', 'Understand difficult ideas')),
      _OrbitMode('flashcards', Icons.style_outlined, 'Flashcards', tr('Memorize conceitos', 'Remember concepts')),
      _OrbitMode('guide', Icons.menu_book_outlined, tr('Guia', 'Study guide'), tr('Resumo e tópicos', 'Summary and outline')),
      _OrbitMode('audio', Icons.headphones_outlined, 'Podcast', tr('Revisão em áudio', 'Audio review')),
      _OrbitMode('insights', Icons.insights_outlined, tr('Memória', 'Insights'), tr('Domínio estimado', 'Estimated mastery')),
      _OrbitMode('game', Icons.extension_outlined, tr('Jogo', 'Study game'), tr('Jogue com seus conteúdos', 'Games from your content')),
      _OrbitMode('friends', Icons.groups_outlined, tr('Amigos', 'Friends'), tr('Estude com uma turma', 'Study with a group')),
      _OrbitMode('library', Icons.auto_stories_outlined, tr('Biblioteca', 'Library'), tr('Materiais salvos', 'Saved material')),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('INSTANTSTUDY™ / ÓRBITA', style: TextStyle(
          fontSize: 10, color: graphite, fontWeight: FontWeight.w500, letterSpacing: 2,
        )),
        const SizedBox(height: 20),
        Text(
          tr('Sua mente,\nem órbita.', 'Put your mind\nin orbit.'),
          style: const TextStyle(fontSize: 46, height: 1.08, letterSpacing: -1,
            color: ink, fontWeight: FontWeight.w300),
        ),
        const SizedBox(height: 16),
        Text(tr(
          'Importe qualquer material, converse, aprenda, pratique e revise em uma única experiência.',
          'Import anything, learn, practice and review in a single experience.',
        ), style: const TextStyle(fontSize: 14, height: 1.5, color: smoke)),
        const SizedBox(height: 24),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 20),
          decoration: BoxDecoration(color: taupe,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: stone)),
          child: Column(
            children: [
              const Align(alignment: Alignment.centerLeft,
                child: Text('THE FUTURE OF LEARNING.', style: TextStyle(
                  fontSize: 9, color: graphite, letterSpacing: 1.2))),
              const SizedBox(height: 6),
              const OrbitalSphere(size: 228),
              const SizedBox(height: 8),
              Text(
                hasMaterial ? tr('Pronta para estudar', 'Ready to study')
                    : tr('Adicione seu primeiro material', 'Add your first material'),
                style: const TextStyle(fontSize: 13, color: graphite, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 14),
              if (hasMaterial && materialTitle != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Text(materialTitle!, textAlign: TextAlign.center,
                    maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: smoke)),
                ),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => onAction(hasMaterial ? 'learn' : 'import'),
                  icon: Icon(hasMaterial ? Icons.play_arrow_rounded : Icons.add_rounded, size: 20),
                  label: Text(hasMaterial ? tr('Continuar aprendendo', 'Continue learning')
                    : tr('Adicionar material', 'Add material')),
                  style: FilledButton.styleFrom(backgroundColor: ink,foregroundColor: eggshell,
                    minimumSize: const Size.fromHeight(52),
                    shape: const StadiumBorder()),
                ),
              ),
              const SizedBox(height: 8),
              Text(tr('A Órbita é visual. As avaliações são registradas pelo motor de estudo.',
                'The Orb is visual. Grades are recorded by the study engine.'),
                textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: smoke)),
            ],
          ),
        ),
        const SizedBox(height: 32),
        Row(children: [
          Expanded(child: Text(tr('O que vamos fazer?', 'What shall we do?'),
            style: const TextStyle(fontSize: 29, fontWeight: FontWeight.w300,
              letterSpacing: -.6, color: ink))),
          TextButton.icon(
            onPressed: () => onAction('import'),
            icon: const Icon(Icons.add_rounded, size: 18),
            label: Text(tr('Importar', 'Import')),
            style: TextButton.styleFrom(foregroundColor: ink,
              shape: const StadiumBorder(side: BorderSide(color: stone))),
          ),
        ]),
        const SizedBox(height: 14),
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth > 650 ? 3 : 2;
          final gap = 10.0;
          final tileWidth = (constraints.maxWidth - gap * (columns - 1)) / columns;
          return Wrap(
            spacing: gap, runSpacing: gap,
            children: modes.map((mode) => SizedBox(
              width: tileWidth,
              child: Material(
                color: taupe,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  onTap: () => onAction(mode.key),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 132),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      border: Border.all(color: stone),
                      borderRadius: BorderRadius.circular(20)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Icon(mode.icon, color: graphite, size: 23),
                      const SizedBox(height: 16),
                      Text(mode.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, color: ink,
                          fontWeight: FontWeight.w500)),
                      const SizedBox(height: 5),
                      Text(mode.subtitle, maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10, color: smoke, height: 1.3)),
                    ]),
                  ),
                ),
              ),
            )).toList(),
          );
        }),
        const SizedBox(height: 20),
        Text(tr(
          'Voz OpenAI Realtime: disponível na versão web mediante conta elegível. O Flutter não simula conversas de voz.',
          'OpenAI Realtime voice: available on eligible web accounts. Flutter does not simulate AI voice calls.',
        ), style: const TextStyle(fontSize: 11, color: smoke, height: 1.5)),
      ],
    );
  }
}

class _OrbitMode {
  const _OrbitMode(this.key, this.icon, this.title, this.subtitle);
  final String key;
  final IconData icon;
  final String title;
  final String subtitle;
}

class OrbitalSphere extends StatefulWidget {
  const OrbitalSphere({super.key, this.size = 228, this.busy = false});
  final double size;
  final bool busy;
  @override
  State<OrbitalSphere> createState() => _OrbitalSphereState();
}

class _OrbitalSphereState extends State<OrbitalSphere> with SingleTickerProviderStateMixin {
  late final AnimationController controller;
  @override
  void initState() {
    super.initState();
    controller = AnimationController(vsync: this,
      duration: const Duration(seconds: 16))..repeat();
  }
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.maybeOf(context)?.disableAnimations == true;
    if (reduced && controller.isAnimating) controller.stop();
    if (!reduced && !controller.isAnimating) controller.repeat();
    final size = widget.size;
    return Semantics(
      label: widget.busy ? 'InstantStudy Orb working' : 'InstantStudy orbital tutor',
      image: true,
      child: SizedBox(width:size, height:size, child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) => CustomPaint(
          painter: _OrbitalPainter(controller.value, widget.busy),
        ),
      )),
    );
  }
}

class _OrbitalPainter extends CustomPainter {
  _OrbitalPainter(this.phase, this.busy);
  final double phase;
  final bool busy;
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final diameter = math.min(size.width, size.height);
    final r = diameter * .45;
    final orbit = Paint()
      ..color = const Color(0xFFDEDAD6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    for (final scale in <double>[.67,.84,1.07]) {
      canvas.drawCircle(center, r * scale, orbit);
    }
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(phase * math.pi * 2 * (busy ? 1.8 : .45));
    final orbRect = Rect.fromCircle(center: Offset.zero, radius:r*.76);
    final clipped = Path()..addOval(orbRect);
    canvas.clipPath(clipped);
    final sweep = Paint()..shader = SweepGradient(
      colors: const [
        Color(0xFF0447FF),Color(0xFFA4C2FF),Color(0xFFF7BAA4),
        Color(0xFFFF4704),Color(0xFFFDF2E9),Color(0xFF0447FF),
      ],stops: const [0,.20,.42,.66,.81,1],
    ).createShader(orbRect);
    canvas.drawCircle(Offset.zero, r*.76, sweep);
    final bloom = Paint()..shader = RadialGradient(
      center: const Alignment(-.42,-.55),
      radius:.92,
      colors: const [Color(0xBBFFFFFF),Color(0x22FFFFFF),Color(0x00FFFFFF)],
    ).createShader(orbRect);
    canvas.drawCircle(Offset.zero,r*.76,bloom);
    canvas.restore();
  }
  @override
  bool shouldRepaint(covariant _OrbitalPainter oldDelegate) =>
    oldDelegate.phase != phase || oldDelegate.busy != busy;
}
