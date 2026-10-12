import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Native launch motion: InstantStudy™ contracts into IStudy™.
/// This is separate from the continuously animated in-app OrbitalSphere.
class StudySplashIntro extends StatefulWidget {
  const StudySplashIntro({super.key, required this.onComplete});

  final VoidCallback onComplete;

  @override
  State<StudySplashIntro> createState() => _StudySplashIntroState();
}

class _StudySplashIntroState extends State<StudySplashIntro>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _started = false;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..addStatusListener((status) {
        if (status == AnimationStatus.completed) _finish();
      });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final reducedMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (reducedMotion) {
        _finish();
      } else {
        _controller.forward();
      }
    });
  }

  void _finish() {
    if (_finished || !mounted) return;
    _finished = true;
    widget.onComplete();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  static double _curve(double value, double start, double end) {
    return Curves.easeInOutCubic.transform(
      ((value - start) / (end - start)).clamp(0.0, 1.0).toDouble(),
    );
  }

  Widget _wordmark(String initial, String name, double size) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Text.rich(
        TextSpan(
          style: TextStyle(
            fontFamily: 'LeagueSpartan',
            fontSize: size,
            height: 1,
            color: Colors.black,
            letterSpacing: -size * .045,
          ),
          children: [
            TextSpan(
              text: initial,
              style: const TextStyle(fontWeight: FontWeight.w400),
            ),
            TextSpan(
              text: name,
              style: const TextStyle(fontWeight: FontWeight.w400),
            ),
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Transform.translate(
                offset: Offset(size * .12, -size * .27),
                child: Text(
                  '™',
                  style: TextStyle(
                    color: Colors.black,
                    fontFamily: 'LeagueSpartan',
                    fontSize: size * .31,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
            ),
          ],
        ),
        textAlign: TextAlign.center,
        textScaler: const TextScaler.linear(1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFDFCFC),
      child: LayoutBuilder(builder: (context, constraints) {
        final startWidth = math.min(constraints.maxWidth * .86, 650.0);
        final endWidth = math.min(constraints.maxWidth * .62, 360.0);
        final pillHeight = math.min(
          math.max(constraints.maxWidth * .20, 94.0),
          146.0,
        );
        final typeSize = math.min(
          math.max(constraints.maxWidth * .078, 26.0),
          54.0,
        );

        return AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            final t = _controller.value;
            final squeeze = _curve(t, .22, .80);
            final fullFade = _curve(t, .35, .69);
            final shortFade = _curve(t, .54, .78);
            final width = startWidth + (endWidth - startWidth) * squeeze;

            return Stack(children: [
              Center(
                child: Semantics(
                  label: 'InstantStudy becomes IStudy',
                  image: true,
                  child: Container(
                    width: width,
                    height: pillHeight,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDFCFC),
                      borderRadius: BorderRadius.circular(1000),
                      border: Border.all(color: Colors.black, width: 4),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Opacity(
                            opacity: 1 - fullFade,
                            child: ImageFiltered(
                              imageFilter: ui.ImageFilter.blur(
                                sigmaX: fullFade * 3,
                                sigmaY: 0,
                              ),
                              child: Transform.scale(
                                scaleX: 1 - fullFade * .31,
                                child: _wordmark('Instant', 'Study', typeSize),
                              ),
                            ),
                          ),
                          Opacity(
                            opacity: shortFade,
                            child: ImageFiltered(
                              imageFilter: ui.ImageFilter.blur(
                                sigmaX: (1 - shortFade) * 3,
                                sigmaY: 0,
                              ),
                              child: Transform.scale(
                                scaleX: .85 + shortFade * .15,
                                child: _wordmark('I', 'Study', typeSize),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                right: 16,
                bottom: 16 + MediaQuery.paddingOf(context).bottom,
                child: TextButton(
                  onPressed: _finish,
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF777169),
                  ),
                  child: const Text('Skip', style: TextStyle(fontSize: 12)),
                ),
              ),
            ]);
          },
        );
      }),
    );
  }
}
