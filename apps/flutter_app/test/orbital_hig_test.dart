import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/orbital_home.dart';

void main() {
  testWidgets('four primary actions appear without exposing all twelve at once',
      (tester) async {
    String? action;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(
        child: OrbitalHome(materialTitle: null, hasMaterial: false,
          onAction: (selected) { action = selected; }),
      )),
    ));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('More tools'), findsOneWidget);
    expect(find.text('Learn'), findsOneWidget);
    expect(find.text('Ask'), findsNothing);
    await tester.ensureVisible(find.text('More tools'));
    await tester.tap(find.text('More tools'));
    await tester.pump(const Duration(milliseconds: 360));
    expect(find.text('Ask'), findsOneWidget);
    await tester.ensureVisible(find.text('Ask'));
    await tester.tap(find.text('Ask'));
    expect(action, 'ask');
  });

  testWidgets('Orbital home uses dynamic height at 200% text size',
      (tester) async {
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
      home: MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: Scaffold(body: SingleChildScrollView(
          child: OrbitalHome(materialTitle: null, hasMaterial: false,
            onAction: (_) {}),
        )),
      ),
    ));
    await tester.pump(const Duration(milliseconds: 90));
    expect(find.text('Continue learning'), findsNothing);
    expect(find.text('Add material'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
