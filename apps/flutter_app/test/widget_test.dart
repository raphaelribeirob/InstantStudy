import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';
import 'package:instantstudy/orbital_home.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('opens the native Orbital OS and routes import', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const InstantStudyApp());
    // Animated sphere runs continuously. pumpAndSettle would not terminate.
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('InstantStudy™'), findsOneWidget);
    expect(find.text('Put your mind\nin orbit.'), findsOneWidget);
    expect(find.byType(OrbitalSphere), findsWidgets);
    expect(find.byType(AppBar), findsNothing);
    expect(find.byType(SegmentedButton<String>), findsNothing);

    await tester.tap(find.byIcon(Icons.language).first);
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Sua mente,\nem órbita.'), findsOneWidget);

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
}
