import 'dart:convert';
import 'dart:math';

import 'package:file_picker/file_picker.dart';
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
  String? _sourceLabel;
  Map<String, dynamic>? _session;
  Map<String, dynamic>? _summary;
  int _testQuestions = 20;
  int _testDuration = 30;

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

  Map<String, dynamic>? get _question =>
      _next?['question'] is Map<String, dynamic>
          ? _next!['question'] as Map<String, dynamic>
          : null;

  List<Map<String, dynamic>> get _choices {
    final raw = _question?['choices'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<void> _pickFile() async {
    setState(() {
      _error = null;
      _busy = true;
    });

    try {
      final result = await FilePicker.pickFiles(
        allowMultiple: false,
        withData: true,
        type: FileType.custom,
        allowedExtensions: const [
          'pdf',
          'docx',
          'pptx',
          'txt',
          'md',
          'csv',
          'mp3',
          'm4a',
          'wav',
          'webm',
          'ogg',
        ],
      );

      if (result == null) return;
      final file = result.files.single;
      final bytes = file.bytes;
      if (bytes == null) {
        throw InstantStudyApiException('Could not read the selected file.');
      }
      if (bytes.length > 2500000) {
        throw InstantStudyApiException(
          'Flutter imports are limited to 2.5 MB per file in this release.',
        );
      }

      final extension = (file.extension ?? '').toLowerCase();
      final audio = {'mp3', 'm4a', 'wav', 'webm', 'ogg'}.contains(extension);
      final imported = await _api.importMaterial(
        learnerId: _learnerId,
        title: _title.text.trim().isEmpty ? file.name : _title.text.trim(),
        sourceType: audio ? 'audio' : 'upload',
        files: [
          {
            'file_id': 'flutter-' + DateTime.now().microsecondsSinceEpoch.toString(),
            'file_name': file.name,
            'inline_base64': base64Encode(bytes),
          },
        ],
      );

      final material = imported['material'];
      if (material is! Map) {
        throw InstantStudyApiException('Material import returned an invalid payload.');
      }

      if (!mounted) return;
      setState(() {
        _material.text = material['content']?.toString() ?? '';
        _title.text = material['title']?.toString() ?? file.name;
        _sourceLabel = file.name;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _start() async {
    if (_material.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
      _feedback = null;
      _summary = null;
    });
    try {
      final result = await _api.prepare(
        contentText: _material.text.trim(),
        title: _title.text.trim().isEmpty ? null : _title.text.trim(),
        mode: _mode,
        learnerId: _learnerId,
        maxQuestions: _mode == 'test' ? _testQuestions : 12,
        testDurationMinutes: _mode == 'test' ? _testDuration : null,
        testQuestionTypes: _mode == 'test'
            ? const [
                'multiple_choice',
                'true_false',
                'short_answer',
                'free_recall',
              ]
            : null,
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

  Future<void> _submit([String? selectedAnswer]) async {
    final sessionId = _session?['studySessionId']?.toString();
    final conceptId = _concept?['id']?.toString();
    final text = (selectedAnswer ?? _answer.text).trim();
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
      final submission = result['submission'];
      final next = result['next'];

      setState(() {
        _answer.clear();
        _feedback = _mode == 'test'
            ? (submission is Map && submission['done'] == true
                ? 'Practice test complete.'
                : 'Answer recorded. Feedback stays hidden until the end.')
            : grade is Map
                ? grade['feedback']?.toString() ?? 'Answer recorded.'
                : 'Answer recorded.';

        if (submission is Map && submission['summary'] is Map) {
          _summary = Map<String, dynamic>.from(submission['summary'] as Map);
        }

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

  Widget _buildQuestion() {
    final prompt =
        _question?['prompt']?.toString() ?? _concept?['label']?.toString() ?? '';
    final policy = _next?['questionPolicy'];
    final type = policy is Map ? policy['type']?.toString() ?? 'adaptive' : 'adaptive';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'QUESTION ${_next?['questionIndex'] ?? '–'} OF ${_next?['totalPlanned'] ?? '–'} · ${type.toUpperCase()}',
          style: const TextStyle(
            color: InstantStudyApp.electric,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          prompt,
          style: const TextStyle(
            fontSize: 32,
            height: 1.05,
            fontWeight: FontWeight.w500,
            letterSpacing: -1.2,
          ),
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
        const SizedBox(height: 18),
        if (_choices.isNotEmpty)
          ..._choices.map(
            (choice) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton(
                onPressed: _busy
                    ? null
                    : () => _submit(choice['value']?.toString() ?? ''),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.all(16),
                ),
                child: Text(
                  '${choice['label'] ?? ''}. ${choice['value'] ?? ''}',
                ),
              ),
            ),
          )
        else ...[
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
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final testResult = _summary?['testResult'];
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
            if (_session == null && _summary == null) ...[
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: 'Title (optional)'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _material,
                minLines: 7,
                maxLines: 14,
                decoration: const InputDecoration(
                  hintText: 'Paste notes, a reading or lecture transcript…',
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _busy ? null : _pickFile,
                icon: const Icon(Icons.upload_file),
                label: Text(_sourceLabel ?? 'Import PDF, DOCX, PPTX, text or audio'),
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
              if (_mode == 'test') ...[
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  initialValue: _testQuestions,
                  decoration: const InputDecoration(labelText: 'Questions'),
                  items: const [10, 20, 30, 40]
                      .map((value) => DropdownMenuItem(
                            value: value,
                            child: Text('$value questions'),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setState(() => _testQuestions = value);
                  },
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<int>(
                  initialValue: _testDuration,
                  decoration: const InputDecoration(labelText: 'Time limit'),
                  items: const [15, 30, 45, 60, 90]
                      .map((value) => DropdownMenuItem(
                            value: value,
                            child: Text('$value minutes'),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setState(() => _testDuration = value);
                  },
                ),
              ],
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
            ] else if (_summary != null) ...[
              Text(
                testResult is Map
                    ? '${testResult['scorePercent'] ?? 0}%'
                    : 'Round complete',
                style: const TextStyle(
                  fontSize: 58,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -3,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                testResult is Map
                    ? '${testResult['answered'] ?? 0} of ${testResult['totalQuestions'] ?? _testQuestions} questions answered.'
                    : 'Your knowledge state has been updated.',
              ),
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: () => setState(() {
                  _session = null;
                  _summary = null;
                  _feedback = null;
                }),
                child: const Text('Study another source'),
              ),
            ] else if (_concept != null) ...[
              _buildQuestion(),
            ] else ...[
              const Text(
                'Session complete.',
                style: TextStyle(fontSize: 34, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: () => setState(() {
                  _session = null;
                  _feedback = null;
                }),
                child: const Text('Study another source'),
              ),
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
