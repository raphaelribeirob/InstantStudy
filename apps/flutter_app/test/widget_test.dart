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
    expect(find.text('Turn notes into\npractice.'), findsOneWidget);
    expect(find.text('Cross-device and ChatGPT account sync is not active yet.'), findsOneWidget);
    expect(find.text('Insights'), findsOneWidget);
    expect(find.byIcon(Icons.headphones_outlined), findsOneWidget);
    expect(find.byIcon(Icons.extension_outlined), findsOneWidget);
    expect(find.byIcon(Icons.language), findsOneWidget);

    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(SegmentedButton<String>), findsNothing);

    await tester.tap(find.byIcon(Icons.language));
    await tester.pumpAndSettle();

    expect(find.text('Transforme notas\nem prática.'), findsOneWidget);
    expect(find.text('A sincronização da conta entre dispositivos e ChatGPT ainda não está ativa.'), findsOneWidget);
    expect(find.text('MODO DE ESTUDO'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Começar a praticar'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('Começar a praticar'), findsOneWidget);
    expect(find.byIcon(Icons.upload_file_outlined), findsOneWidget);
  });
}
