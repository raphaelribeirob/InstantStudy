import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';
import 'package:instantstudy/orbital_home.dart';
import 'package:instantstudy/study_splash_intro.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('opens the native Orbital OS and routes import', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    // The one-shot splash must finish before the underlying UI accepts taps.
    await tester.pump();
    expect(find.byType(StudySplashIntro), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1750));
    expect(find.byType(StudySplashIntro), findsNothing);
    // OrbitalSphere loops continuously; do not use pumpAndSettle.

    expect(find.text('InstantStudy™'), findsOneWidget);
    expect(find.text('Put your mind\nin orbit.'), findsOneWidget);
    expect(find.byType(OrbitalSphere), findsWidgets);
    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(SegmentedButton<String>), findsNothing);

    await tester.tap(find.byIcon(Icons.language).first);
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Sua mente,\nem órbita.'), findsOneWidget);

    await tester.ensureVisible(find.text('Adicionar material').first);
    await tester.pump(const Duration(milliseconds: 120));
    await tester.tap(find.text('Adicionar material').first);
    await tester.pump(const Duration(milliseconds: 380));
    expect(find.text('Aprenda com\nqualquer coisa.'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Começar InstantStudy'),
      280,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Começar InstantStudy'), findsOneWidget);
    expect(find.byIcon(Icons.upload_file_outlined), findsOneWidget);
  });

  testWidgets('opening wordmarks use bundled League Spartan Regular 400',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pump();

    // Inspect the authored Text.rich spans, not inherited RichText styles.
    final openingText = tester.widgetList<Text>(
      find.descendant(
        of: find.byType(StudySplashIntro),
        matching: find.byType(Text),
      ),
    ).where((widget) {
      final plain = widget.textSpan?.toPlainText() ?? '';
      return plain.contains('InstantStudy') || plain.contains('IStudy');
    }).toList();

    expect(openingText, hasLength(2));
    for (final wordmark in openingText) {
      final span = wordmark.textSpan!;
      expect(span.style?.fontFamily, 'LeagueSpartan');
      for (final child in span.children!) {
        if (child is TextSpan) {
          expect(child.style?.fontWeight, FontWeight.w400);
        } else if (child is WidgetSpan) {
          // Superscript trademark is rendered separately in the same family.
          final trademarkTransform = child.child as Transform;
          final trademark = trademarkTransform.child as Text;
          expect(trademark.style?.fontFamily, 'LeagueSpartan');
          expect(trademark.style?.fontWeight, FontWeight.w400);
        }
      }
    }
  });

  testWidgets('opening motion can be skipped without remounting the app',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pump();
    expect(find.byType(StudySplashIntro), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);

    await tester.tap(find.text('Skip'));
    await tester.pump();
    expect(find.byType(StudySplashIntro), findsNothing);
    expect(find.byType(OrbitalSphere), findsWidgets);
  });

}
