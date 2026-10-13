import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';
import 'package:instantstudy/native_hard_paywall.dart';
import 'package:instantstudy/orbital_home.dart';
import 'package:instantstudy/study_splash_intro.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('native purchase gate is fail-closed after splash', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pump();
    expect(find.byType(StudySplashIntro), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 1750));
    expect(find.byType(StudySplashIntro), findsNothing);
    expect(find.byType(NativeHardPaywall), findsOneWidget);
    expect(find.byType(OrbitalHome), findsNothing);
    expect(find.byType(OrbitalSphere), findsNothing);
    expect(find.text('Assinaturas nativas ainda não estão configuradas.'),
      findsOneWidget);
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
      final span = wordmark.textSpan! as TextSpan;
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
    expect(find.byType(NativeHardPaywall), findsOneWidget);
    expect(find.byType(OrbitalSphere), findsNothing);
  });

}
