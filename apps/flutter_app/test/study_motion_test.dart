import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/study_motion.dart';

void main() {
  testWidgets('standard motion is restrained by default', (tester) async {
    late Duration duration;
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      duration = StudyMotion.duration(context, StudyMotion.standard);
      return const SizedBox();
    })));
    expect(duration, const Duration(milliseconds: 240));
  });

  testWidgets('accessibility reduce-motion removes native transitions', (tester) async {
    late Duration duration;
    await tester.pumpWidget(MaterialApp(home: MediaQuery(
      data: const MediaQueryData(disableAnimations: true),
      child: Builder(builder: (context) {
        duration = StudyMotion.duration(context, StudyMotion.standard);
        return const SizedBox();
      }),
    )));
    expect(duration, Duration.zero);
  });
}
