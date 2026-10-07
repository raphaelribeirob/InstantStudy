import 'dart:math';

import 'package:flutter/material.dart';

import 'instantstudy_api.dart';

void main() {
  runApp(const InstantStudyApp());
}

class InstantStudyApp extends StatelessWidget {
  const InstantStudyApp({super.key});

  static const ink = Color(0xFF11110F);
  static const paper = Color(0xFFF2F0EA);
  static const orange = Color(0xFFE36232);
  static const electric = Color(0xFF5B6CFF);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'InstantStudy',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: electric,
          brightness: Brightness.light,
          surface: paper,
        ),
        scaffoldBackgroundColor: paper,
        useMaterial3: true,
      ),
      home: const StudyHome(),
    );
  }
}

class StudyHome extends StatefulWidget {
  const StudyHome({super.key});

  @override
  State<StudyHome> createState() => _StudyHomeState();
}

class _StudyHomeState extends State<StudyHome> {
  final _api = InstantStudyApi();
  final _material = TextEditingController();
  final _answer = TextEditingController();
  final _title = TextEditingController();
  late final String _learnerId;

  String _mode = 'learn';
  bool _busy = false;
  String? _error;
  String? _feedback;
  Map<String, dynamic>? _session;

  @override
  void initState() {
    super.initState();
    _learnerId = 'flutter-' +
        DateTime.now().microsecondsSinceEpoch.toString() +
        '-' +
        Random.secure().nextInt(1 << 32).toString();
  }

  @override
  void dispose() {
    _material.dispose();
    _answer.dispose();
    _title.dispose();
    super.dispose();
  }

  Map<String, dynamic>? get _next =>
      _session?['next'] is Map<String, dynamic>
          ? _session!['next'] as Map<String, dynamic>
          : null;

  Map<String, dynamic>? get _concept =>
      _next?['concept'] is Map<String, dynamic>
          ? _next!['concept'] as Map<String, dynamic>
          : null;

  Future<void> _start() async {
    if (_material.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _feedback = null;
    });
    try {
      final result = await _api.prepare(
        contentText: _material.text.trim(),
        title: _title.text.trim().isEmpty ? null : _title.text.trim(),
        mode: _mode,
        learnerId: _learnerId,
      );
      if (!mounted) return;
      setState(() => _session = result);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    final sessionId = _session?['studySessionId']?.toString();
    final conceptId = _concept?['id']?.toString();
    final text = _answer.text.trim();
    if (sessionId == null || conceptId == null || text.isEmpty) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final result = await _api.answer(
        studySessionId: sessionId,
        conceptId: conceptId,
        userAnswer: text,
      );
      if (!mounted) return;

      final grade = result['grade'];
      final next = result['next'];
      setState(() {
        _answer.clear();
        _feedback = grade is Map<String, dynamic>
            ? grade['feedback']?.toString() ?? 'Answer recorded.'
            : 'Answer recorded.';
        _session = {
          ...?_session,
          'next': next,
        };
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final questionPolicy = _next?['questionPolicy'] is Map<String, dynamic>
        ? _next!['questionPolicy'] as Map<String, dynamic>
        : null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'InstantStudy™',
          style: TextStyle(
            color: InstantStudyApp.ink,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
          ),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 48),
          children: [
            const Text(
              'THE FUTURE OF LEARNING',
              style: TextStyle(
                color: InstantStudyApp.orange,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Learn from\nanything.',
              style: TextStyle(
                color: InstantStudyApp.ink,
                fontSize: 58,
                height: 0.9,
                fontWeight: FontWeight.w500,
                letterSpacing: -4,
              ),
            ),
            const SizedBox(height: 28),
            if (_session == null) ...[
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title (optional)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _material,
                minLines: 8,
                maxLines: 16,
                decoration: const InputDecoration(
                  hintText: 'Paste notes, a reading or lecture transcript…',
                ),
              ),
              const SizedBox(height: 16),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'learn', label: Text('Learn')),
                  ButtonSegment(value: 'quiz', label: Text('Quiz')),
                  ButtonSegment(value: 'test', label: Text('Test')),
                  ButtonSegment(value: 'review', label: Text('Review')),
                ],
                selected: {_mode},
                onSelectionChanged: (value) {
                  setState(() => _mode = value.first);
                },
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _start,
                style: FilledButton.styleFrom(
                  backgroundColor: InstantStudyApp.ink,
                  foregroundColor: InstantStudyApp.paper,
                  minimumSize: const Size.fromHeight(52),
                ),
                child: Text(_busy ? 'Building…' : 'Start InstantStudy'),
              ),
            ] else ...[
              Text(
                _concept?['label']?.toString() ?? 'Session complete',
                style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -1.5,
                ),
              ),
              const SizedBox(height: 12),
              if (questionPolicy?['instruction'] != null)
                Text(
                  questionPolicy!['instruction'].toString(),
                  style: const TextStyle(fontSize: 16, height: 1.5),
                ),
              if (_feedback != null) ...[
                const SizedBox(height: 16),
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE9E7E1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Text(_feedback!),
                  ),
                ),
              ],
              if (_concept != null) ...[
                const SizedBox(height: 20),
                TextField(
                  controller: _answer,
                  minLines: 4,
                  maxLines: 10,
                  decoration: const InputDecoration(
                    hintText: 'Type your answer…',
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: InstantStudyApp.ink,
                    foregroundColor: InstantStudyApp.paper,
                    minimumSize: const Size.fromHeight(52),
                  ),
                  child: Text(_busy ? 'Evaluating…' : 'Submit answer'),
                ),
              ] else ...[
                const SizedBox(height: 20),
                OutlinedButton(
                  onPressed: () => setState(() {
                    _session = null;
                    _feedback = null;
                  }),
                  child: const Text('Study another source'),
                ),
              ],
            ],
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
