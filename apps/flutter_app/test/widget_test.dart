import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';

void main() {
  testWidgets('renders the InstantStudy editorial study entry', (tester) async {
    await tester.pumpWidget(const InstantStudyApp());

    expect(find.text('InstantStudy™'), findsOneWidget);
    expect(find.text('Learn from\nanything.'), findsOneWidget);
    expect(find.text('Insights'), findsOneWidget);

    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(SegmentedButton<String>), findsNothing);

    await tester.scrollUntilVisible(
      find.text('Start InstantStudy'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('Start InstantStudy'), findsOneWidget);
    expect(find.byIcon(Icons.upload_file_outlined), findsOneWidget);
  });
}
