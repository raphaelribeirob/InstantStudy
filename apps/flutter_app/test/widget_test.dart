import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('renders the InstantStudy editorial study entry', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pumpAndSettle();

    expect(find.text('InstantStudy™'), findsOneWidget);
    expect(find.text('Learn from\nanything.'), findsOneWidget);
    expect(find.text('Insights'), findsOneWidget);
    expect(find.byIcon(Icons.headphones_outlined), findsOneWidget);
    expect(find.byIcon(Icons.extension_outlined), findsOneWidget);
    expect(find.byIcon(Icons.language), findsOneWidget);

    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(SegmentedButton<String>), findsNothing);

    await tester.tap(find.byIcon(Icons.language));
    await tester.pumpAndSettle();

    expect(find.text('Aprenda com\nqualquer coisa.'), findsOneWidget);
    expect(find.text('MODO DE ESTUDO'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Começar InstantStudy'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('Começar InstantStudy'), findsOneWidget);
    expect(find.byIcon(Icons.upload_file_outlined), findsOneWidget);
  });
  testWidgets('preserves the same anonymous learner ID after widget restart', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pumpAndSettle();
    final prefs = await SharedPreferences.getInstance();
    final firstId = prefs.getString('instantstudy.learner_id');
    expect(firstId, isNotNull);
    expect(firstId, startsWith('flutter-'));

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await tester.pumpWidget(const InstantStudyApp());
    await tester.pumpAndSettle();
    expect(prefs.getString('instantstudy.learner_id'), firstId);
  });

}
