import 'package:flutter_test/flutter_test.dart';
import 'package:instantstudy/main.dart';

void main() {
  testWidgets('renders the Flutter-first study entry', (tester) async {
    await tester.pumpWidget(const InstantStudyApp());

    expect(find.text('InstantStudy™'), findsOneWidget);
    expect(find.text('Learn from\nanything.'), findsOneWidget);
    expect(find.text('Start InstantStudy'), findsOneWidget);
  });
}
