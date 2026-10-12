import 'package:flutter/material.dart';

/// Calm editorial motion tokens shared by all native learning panels.
/// Native Cupertino gesture transitions remain native on iOS/macOS.
abstract final class StudyMotion {
  static const fast = Duration(milliseconds: 160);
  static const standard = Duration(milliseconds: 240);
  static const deliberate = Duration(milliseconds: 340);

  static Duration duration(BuildContext context, Duration value) {
    return MediaQuery.maybeOf(context)?.disableAnimations == true
        ? Duration.zero
        : value;
  }
}

/// Low-distance navigation fade. Deliberately avoids zoom and expensive blur.
class StudyPageTransitionsBuilder extends PageTransitionsBuilder {
  const StudyPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.maybeOf(context)?.disableAnimations == true) return child;
    final fade = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: fade,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, .018),
          end: Offset.zero,
        ).animate(fade),
        child: child,
      ),
    );
  }
}
