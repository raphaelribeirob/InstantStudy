import 'dart:convert';
import 'dart:math';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'i18n.dart';
import 'instantstudy_api.dart';

void main() {
  runApp(const InstantStudyApp());
}

class InstantStudyApp extends StatefulWidget {
  const InstantStudyApp({super.key});

  static const ink = Color(0xFF11110F);
  static const paper = Color(0xFFF2F0EA);
  static const paper2 = Color(0xFFE9E7E1);
  static const paper3 = Color(0xFFDEDBD3);
  static const orange = Color(0xFFE36232);
  static const orangeSoft = Color(0xFFF1A06F);
  static const electric = Color(0xFF5B6CFF);
  static const green = Color(0xFF98BD9D);
  static const muted = Color(0xFF6E6B64);

  @override
  State<InstantStudyApp> createState() => _InstantStudyAppState();
}

class _InstantStudyAppState extends State<InstantStudyApp> {
  static const _localeKey = 'instantstudy.locale';
  Locale? _locale;

  @override
  void initState() {
    super.initState();
    _loadLocale();
  }

  Future<void> _loadLocale() async {
    final preferences = await SharedPreferences.getInstance();
    final stored = preferences.getString(_localeKey);
    if (!mounted || stored == null) return;
    setState(() {
      _locale = stored.toLowerCase().startsWith('pt')
          ? const Locale('pt', 'BR')
          : const Locale('en');
    });
  }

  Future<void> _setLocale(Locale locale) async {
    final normalized = locale.languageCode == 'pt'
        ? const Locale('pt', 'BR')
        : const Locale('en');
    setState(() => _locale = normalized);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _localeKey,
      normalized.languageCode == 'pt' ? 'pt-BR' : 'en',
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'InstantStudy',
      debugShowCheckedModeBanner: false,
      locale: _locale,
      supportedLocales: supportedInstantStudyLocales,
      localizationsDelegates: const [
        AppStrings.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      localeResolutionCallback: (deviceLocale, supported) {
        if (_locale != null) return _locale;
        if (deviceLocale?.languageCode == 'pt') {
          return const Locale('pt', 'BR');
        }
        return const Locale('en');
      },
      theme: ThemeData(
        fontFamily: 'Inter',
        scaffoldBackgroundColor: InstantStudyApp.paper2,
        colorScheme: const ColorScheme.light(
          primary: InstantStudyApp.ink,
          secondary: InstantStudyApp.orange,
          surface: InstantStudyApp.paper,
          onSurface: InstantStudyApp.ink,
        ),
        textSelectionTheme: const TextSelectionThemeData(
          cursorColor: InstantStudyApp.electric,
          selectionColor: Color(0x335B6CFF),
        ),
        useMaterial3: true,
      ),
      home: StudyHome(onLocaleChanged: _setLocale),
    );
  }
}

class StudyHome extends StatefulWidget {
  const StudyHome({
    super.key,
    required this.onLocaleChanged,
  });

  final ValueChanged<Locale> onLocaleChanged;

  @override
  State<StudyHome> createState() => _StudyHomeState();
}

class _StudyHomeState extends State<StudyHome> {
  final _api = InstantStudyApi();
  final _material = TextEditingController();
  final _answer = TextEditingController();
  final _title = TextEditingController();
  final _tts = FlutterTts();
  late final String _learnerId;

  String _mode = 'learn';
  bool _busy = false;
  String? _error;
  String? _feedback;
  String? _sourceLabel;
  String? _materialId;
  bool _podcastPlaying = false;
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
    _tts.stop();
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
          'pdf','docx','pptx','txt','md','csv',
          'mp3','m4a','wav','webm','ogg',
          'png','jpg','jpeg','webp',
        ],
      );

      if (result == null) return;
      final file = result.files.single;
      final bytes = file.bytes;
      if (bytes == null) {
        throw InstantStudyApiException(context.tr('couldNotRead'));
      }
      if (bytes.length > 2500000) {
        throw InstantStudyApiException(
          context.tr('uploadLimit'),
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
            'file_id': 'flutter-' +
                DateTime.now().microsecondsSinceEpoch.toString(),
            'file_name': file.name,
            'inline_base64': base64Encode(bytes),
          },
        ],
      );

      final material = imported['material'];
      if (material is! Map) {
        throw InstantStudyApiException(
          context.tr('invalidImport'),
        );
      }

      if (!mounted) return;
      setState(() {
        _material.text = material['content']?.toString() ?? '';
        _title.text = material['title']?.toString() ?? file.name;
        _materialId = material['id']?.toString();
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
      if (_materialId == null) {
        final imported = await _api.importMaterial(
          learnerId: _learnerId,
          title: _title.text.trim().isEmpty ? null : _title.text.trim(),
          contentText: _material.text.trim(),
          sourceType: 'paste',
        );
        final material = imported['material'];
        if (material is Map) {
          _materialId = material['id']?.toString();
        }
      }

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
          _summary =
              Map<String, dynamic>.from(submission['summary'] as Map);
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

  Future<void> _showPodcast() async {
    final materialId = _materialId;
    if (materialId == null) {
      setState(() => _error = context.tr('saveFirstPodcast'));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _api.audioStudy(
        learnerId: _learnerId,
        materialId: materialId,
      );
      if (!mounted) return;
      final segments = data['segments'] is List
          ? (data['segments'] as List)
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList()
          : <Map<String, dynamic>>[];

      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        barrierColor: Colors.black54,
        builder: (context) => _PodcastScene(
          title: data['title']?.toString() ?? 'InstantStudy Podcast',
          estimatedMinutes: (data['estimatedMinutes'] as num?)?.toInt() ?? 1,
          segments: segments,
          playing: _podcastPlaying,
          onPlay: () => _playPodcast(segments),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _playPodcast(List<Map<String, dynamic>> segments) async {
    if (_podcastPlaying) {
      await _tts.stop();
      if (mounted) setState(() => _podcastPlaying = false);
      return;
    }

    if (mounted) setState(() => _podcastPlaying = true);
    await _tts.awaitSpeakCompletion(true);

    for (final segment in segments) {
      if (!_podcastPlaying) break;
      final speaker = segment['speaker']?.toString() ?? 'Host';
      await _tts.setSpeechRate(speaker == 'Host' ? 0.48 : 0.44);
      await _tts.setPitch(speaker == 'Host' ? 1.04 : 0.9);
      await _tts.speak(segment['text']?.toString() ?? '');
    }

    if (mounted) setState(() => _podcastPlaying = false);
  }

  Future<void> _showGame() async {
    final materialId = _materialId;
    if (materialId == null) {
      setState(() => _error = context.tr('saveFirstGame'));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await _api.studyGame(
        learnerId: _learnerId,
        materialId: materialId,
      );
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        barrierColor: Colors.black54,
        builder: (context) => _StudyGameScene(game: data),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showInsights() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final data = await _api.insights(learnerId: _learnerId);
      if (!mounted) return;

      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        barrierColor: Colors.black54,
        builder: (context) => _InsightsScene(data: data),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Color get _orbPrimary {
    if (_mode == 'test') return InstantStudyApp.paper;
    if (_mode == 'review') return InstantStudyApp.orange;
    return InstantStudyApp.electric;
  }

  Color get _orbSecondary {
    if (_mode == 'test') return const Color(0xFF57544E);
    if (_mode == 'review') return InstantStudyApp.orangeSoft;
    return InstantStudyApp.orange;
  }

  Widget _buildQuestion() {
    final prompt =
        _question?['prompt']?.toString() ?? _concept?['label']?.toString() ?? '';
    final policy = _next?['questionPolicy'];
    final type =
        policy is Map ? policy['type']?.toString() ?? 'adaptive' : 'adaptive';

    return _DarkStudyScene(
      eyebrow: context.tr('questionProgress', {
        'current': _next?['questionIndex'] ?? '–',
        'total': _next?['totalPlanned'] ?? '–',
        'type': type.toUpperCase(),
      }),
      title: prompt,
      feedback: _feedback,
      child: _choices.isNotEmpty
          ? Column(
              children: _choices
                  .map(
                    (choice) => Padding(
                      padding: const EdgeInsets.only(bottom: 1),
                      child: _ChoiceRow(
                        label: choice['label']?.toString() ?? '',
                        value: choice['value']?.toString() ?? '',
                        enabled: !_busy,
                        onTap: () =>
                            _submit(choice['value']?.toString() ?? ''),
                      ),
                    ),
                  )
                  .toList(),
            )
          : Column(
              children: [
                _LineField(
                  controller: _answer,
                  hint: context.tr('typeAnswer'),
                  minLines: 4,
                  maxLines: 10,
                  dark: true,
                ),
                const SizedBox(height: 14),
                _SignalButton(
                  label: _busy ? context.tr('evaluating') : context.tr('submitAnswer'),
                  onPressed: _busy ? null : _submit,
                  light: true,
                ),
              ],
            ),
    );
  }

  Widget _buildEntry() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.tr('futureLearning'),
          style: const TextStyle(
            color: InstantStudyApp.orange,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          context.tr('learnAnything'),
          style: const TextStyle(
            color: InstantStudyApp.ink,
            fontSize: 66,
            height: .82,
            fontWeight: FontWeight.w500,
            letterSpacing: -4.8,
          ),
        ),
        const SizedBox(height: 22),
        Text(
          context.tr('entryBody'),
          style: const TextStyle(
            color: Color(0xFF46443F),
            fontSize: 18,
            height: 1.28,
            letterSpacing: -.35,
          ),
        ),
        const SizedBox(height: 36),
        _SectionRule(label: context.tr('yourMaterial')),
        _LineField(
          controller: _title,
          hint: context.tr('titleOptional'),
          minLines: 1,
          maxLines: 1,
        ),
        const SizedBox(height: 1),
        _LineField(
          controller: _material,
          hint: context.tr('pasteMaterial'),
          minLines: 7,
          maxLines: 14,
        ),
        const SizedBox(height: 12),
        _SignalButton(
          label: _sourceLabel ?? context.tr('importMaterial'),
          icon: Icons.upload_file_outlined,
          onPressed: _busy ? null : _pickFile,
          outlined: true,
        ),
        const SizedBox(height: 28),
        _SectionRule(label: context.tr('studyMode')),
        _ModeRail(
          selected: _mode,
          onSelected: (value) => setState(() => _mode = value),
        ),
        if (_mode == 'test') ...[
          const SizedBox(height: 22),
          _TestControls(
            questions: _testQuestions,
            duration: _testDuration,
            onQuestions: (value) => setState(() => _testQuestions = value),
            onDuration: (value) => setState(() => _testDuration = value),
          ),
        ],
        const SizedBox(height: 30),
        _SignalButton(
          label: _busy ? context.tr('building') : context.tr('start'),
          onPressed: _busy ? null : _start,
        ),
      ],
    );
  }

  Widget _buildSummary() {
    final testResult = _summary?['testResult'];
    final value = testResult is Map
        ? '${testResult['scorePercent'] ?? 0}%'
        : context.tr('complete');
    final copy = testResult is Map
        ? '${testResult['answered'] ?? 0} of ${testResult['totalQuestions'] ?? _testQuestions} questions answered.'
        : 'Your knowledge state has been updated. Review will bring concepts back when they begin to fade.';

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 34, 24, 30),
      color: _mode == 'review'
          ? InstantStudyApp.orange
          : InstantStudyApp.paper,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('knowledgeUpdated'),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 28),
          Text(
            value,
            style: const TextStyle(
              fontSize: 74,
              height: .86,
              fontWeight: FontWeight.w500,
              letterSpacing: -5,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            copy,
            style: const TextStyle(
              fontSize: 17,
              height: 1.45,
              color: InstantStudyApp.muted,
            ),
          ),
          const SizedBox(height: 34),
          _SignalButton(
            label: context.tr('studyAnother'),
            onPressed: () => setState(() {
              _session = null;
              _summary = null;
              _feedback = null;
            }),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final motionDuration =
        MediaQuery.maybeOf(context)?.disableAnimations == true
            ? Duration.zero
            : const Duration(milliseconds: 320);

    return Scaffold(
      body: Stack(
        children: [
          const Positioned.fill(
            child: ColoredBox(color: InstantStudyApp.paper2),
          ),
          const Positioned.fill(
            child: IgnorePointer(child: _GrainLayer()),
          ),
          SafeArea(
            child: Column(
              children: [
                _ProductMasthead(
                  primary: _orbPrimary,
                  secondary: _orbSecondary,
                  busy: _busy,
                  onInsights: _showInsights,
                  onPodcast: _materialId == null ? null : _showPodcast,
                  onGame: _materialId == null ? null : _showGame,
                  onLanguage: () {
                    final locale = Localizations.localeOf(context);
                    widget.onLocaleChanged(
                      locale.languageCode == 'pt'
                          ? const Locale('en')
                          : const Locale('pt', 'BR'),
                    );
                  },
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(18, 32, 18, 54),
                    children: [
                      AnimatedSwitcher(
                        duration: motionDuration,
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        child: _session == null && _summary == null
                            ? KeyedSubtree(
                                key: const ValueKey('entry'),
                                child: _buildEntry(),
                              )
                            : _summary != null
                                ? KeyedSubtree(
                                    key: const ValueKey('summary'),
                                    child: _buildSummary(),
                                  )
                                : _concept != null
                                    ? KeyedSubtree(
                                        key: ValueKey(
                                          _next?['questionIndex'] ?? 'question',
                                        ),
                                        child: _buildQuestion(),
                                      )
                                    : KeyedSubtree(
                                        key: const ValueKey('complete'),
                                        child: _buildSummary(),
                                      ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: const BoxDecoration(
                            border: Border(
                              left: BorderSide(
                                color: InstantStudyApp.orange,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              color: InstantStudyApp.ink,
                              height: 1.45,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductMasthead extends StatelessWidget {
  const _ProductMasthead({
    required this.primary,
    required this.secondary,
    required this.busy,
    required this.onInsights,
    required this.onPodcast,
    required this.onGame,
    required this.onLanguage,
  });

  final Color primary;
  final Color secondary;
  final bool busy;
  final VoidCallback onInsights;
  final VoidCallback? onPodcast;
  final VoidCallback? onGame;
  final VoidCallback onLanguage;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 62,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0x2E11110F)),
        ),
      ),
      child: Row(
        children: [
          _InstantOrb(primary: primary, secondary: secondary, size: 28),
          const SizedBox(width: 10),
          Text(
            context.tr('product'),
            style: const TextStyle(
              color: InstantStudyApp.ink,
              fontSize: 14,
              fontWeight: FontWeight.w600,
              letterSpacing: -.4,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: busy ? null : onInsights,
            style: TextButton.styleFrom(
              foregroundColor: InstantStudyApp.ink,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: const StadiumBorder(
                side: BorderSide(color: Color(0x2E11110F)),
              ),
            ),
            child: Text(
              context.tr('insights'),
              style: const TextStyle(fontSize: 10, letterSpacing: .4),
            ),
          ),
          IconButton(
            tooltip: context.tr('podcast'),
            onPressed: busy ? null : onPodcast,
            icon: const Icon(Icons.headphones_outlined, size: 18),
          ),
          IconButton(
            tooltip: context.tr('studyGame'),
            onPressed: busy ? null : onGame,
            icon: const Icon(Icons.extension_outlined, size: 18),
          ),
          IconButton(
            tooltip: context.tr('language'),
            onPressed: busy ? null : onLanguage,
            icon: const Icon(Icons.language, size: 18),
          ),
        ],
      ),
    );
  }
}

class _InstantOrb extends StatelessWidget {
  const _InstantOrb({
    required this.primary,
    required this.secondary,
    this.size = 34,
  });

  final Color primary;
  final Color secondary;
  final double size;

  @override
  Widget build(BuildContext context) {
    final motionDuration =
        MediaQuery.maybeOf(context)?.disableAnimations == true
            ? Duration.zero
            : const Duration(milliseconds: 460);

    return Semantics(
      label: 'InstantStudy learning state',
      child: SizedBox.square(
        dimension: size,
        child: ClipOval(
          child: DecoratedBox(
            decoration: const BoxDecoration(color: Color(0xFFCBC7BD)),
            child: Stack(
              clipBehavior: Clip.hardEdge,
              children: [
                AnimatedPositioned(
                  duration: motionDuration,
                  curve: Curves.easeOutCubic,
                  left: -size * .04,
                  bottom: -size * .03,
                  width: size * .68,
                  height: size * .68,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: primary,
                    ),
                  ),
                ),
                AnimatedPositioned(
                  duration: motionDuration,
                  curve: Curves.easeOutCubic,
                  right: -size * .01,
                  top: -size * .01,
                  width: size * .43,
                  height: size * .43,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: secondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeRail extends StatelessWidget {
  const _ModeRail({
    required this.selected,
    required this.onSelected,
  });

  final String selected;
  final ValueChanged<String> onSelected;

  static const modes = ['learn', 'quiz', 'test', 'review'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0x2E11110F)),
      ),
      child: Row(
        children: modes.map((mode) {
          final active = selected == mode;
          return Expanded(
            child: InkWell(
              onTap: () => onSelected(mode),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                constraints: const BoxConstraints(minHeight: 46),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: active ? InstantStudyApp.ink : Colors.transparent,
                  border: Border(
                    right: mode == modes.last
                        ? BorderSide.none
                        : const BorderSide(color: Color(0x2E11110F)),
                  ),
                ),
                child: Text(
                  context.tr(mode),
                  style: TextStyle(
                    color: active
                        ? InstantStudyApp.paper
                        : InstantStudyApp.muted,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: .9,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _TestControls extends StatelessWidget {
  const _TestControls({
    required this.questions,
    required this.duration,
    required this.onQuestions,
    required this.onDuration,
  });

  final int questions;
  final int duration;
  final ValueChanged<int> onQuestions;
  final ValueChanged<int> onDuration;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ChoiceSelect(
            label: context.tr('questions'),
            value: questions,
            values: const [10, 20, 30, 40],
            formatter: (value) => '$value',
            onChanged: onQuestions,
          ),
        ),
        const SizedBox(width: 1),
        Expanded(
          child: _ChoiceSelect(
            label: context.tr('time'),
            value: duration,
            values: const [15, 30, 45, 60, 90],
            formatter: (value) => '$value min',
            onChanged: onDuration,
          ),
        ),
      ],
    );
  }
}

class _ChoiceSelect extends StatelessWidget {
  const _ChoiceSelect({
    required this.label,
    required this.value,
    required this.values,
    required this.formatter,
    required this.onChanged,
  });

  final String label;
  final int value;
  final List<int> values;
  final String Function(int value) formatter;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 8),
      color: InstantStudyApp.paper,
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          isExpanded: true,
          value: value,
          dropdownColor: InstantStudyApp.paper,
          icon: const Icon(Icons.expand_more, size: 18),
          items: values
              .map(
                (item) => DropdownMenuItem<int>(
                  value: item,
                  child: Text(
                    '${label.toUpperCase()} · ${formatter(item)}',
                    style: const TextStyle(
                      fontSize: 10,
                      letterSpacing: .5,
                    ),
                  ),
                ),
              )
              .toList(),
          onChanged: (next) {
            if (next != null) onChanged(next);
          },
        ),
      ),
    );
  }
}

class _LineField extends StatelessWidget {
  const _LineField({
    required this.controller,
    required this.hint,
    required this.minLines,
    required this.maxLines,
    this.dark = false,
  });

  final TextEditingController controller;
  final String hint;
  final int minLines;
  final int maxLines;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final foreground =
        dark ? const Color(0xFFEFEDE7) : InstantStudyApp.ink;
    final muted = dark ? const Color(0xFF77736B) : InstantStudyApp.muted;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: dark ? Colors.transparent : InstantStudyApp.paper,
        border: Border.all(
          color: dark
              ? const Color(0x2EEFEDE7)
              : const Color(0x2E11110F),
        ),
      ),
      child: TextField(
        controller: controller,
        minLines: minLines,
        maxLines: maxLines,
        style: TextStyle(
          color: foreground,
          fontSize: minLines > 1 ? 16 : 14,
          height: 1.5,
        ),
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hint,
          hintStyle: TextStyle(color: muted),
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }
}

class _SignalButton extends StatelessWidget {
  const _SignalButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.outlined = false,
    this.light = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool outlined;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final background = outlined
        ? Colors.transparent
        : light
            ? const Color(0xFFEFEDE7)
            : InstantStudyApp.ink;
    final foreground = outlined
        ? InstantStudyApp.ink
        : light
            ? InstantStudyApp.ink
            : InstantStudyApp.paper;

    return SizedBox(
      width: double.infinity,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          backgroundColor: background,
          foregroundColor: foreground,
          disabledForegroundColor: foreground.withValues(alpha: .35),
          shape: StadiumBorder(
            side: outlined
                ? const BorderSide(color: InstantStudyApp.ink)
                : BorderSide.none,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 17),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: .4,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.label,
    required this.value,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final String value;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      child: Container(
        constraints: const BoxConstraints(minHeight: 66),
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          color: Color(0xFF191917),
          border: Border(
            bottom: BorderSide(color: Color(0x2EEFEDE7)),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: InstantStudyApp.orange,
                shape: BoxShape.circle,
              ),
              child: Text(
                label,
                style: const TextStyle(
                  color: InstantStudyApp.ink,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                value,
                style: const TextStyle(
                  color: Color(0xFFEFEDE7),
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DarkStudyScene extends StatelessWidget {
  const _DarkStudyScene({
    required this.eyebrow,
    required this.title,
    required this.child,
    this.feedback,
  });

  final String eyebrow;
  final String title;
  final String? feedback;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 30, 22, 24),
      color: InstantStudyApp.ink,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            eyebrow,
            style: const TextStyle(
              color: InstantStudyApp.orangeSoft,
              fontSize: 9,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 34),
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFFEFEDE7),
              fontSize: 38,
              height: .98,
              fontWeight: FontWeight.w500,
              letterSpacing: -1.8,
            ),
          ),
          if (feedback != null) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              decoration: const BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: InstantStudyApp.orange,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                feedback!,
                style: const TextStyle(
                  color: Color(0xFFAAA69D),
                  height: 1.45,
                ),
              ),
            ),
          ],
          const SizedBox(height: 28),
          child,
        ],
      ),
    );
  }
}

class _SectionRule extends StatelessWidget {
  const _SectionRule({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 10),
      margin: const EdgeInsets.only(bottom: 1),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0x2E11110F)),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: InstantStudyApp.muted,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _InsightsScene extends StatelessWidget {
  const _InsightsScene({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final mastery =
        ((data['averageMastery'] as num?)?.toDouble() ?? 0) * 100;
    final retention =
        ((data['retentionScore'] as num?)?.toDouble() ?? 0) * 100;
    final weak = data['weakConcepts'] is List
        ? (data['weakConcepts'] as List).whereType<Map>().toList()
        : const <Map>[];

    return FractionallySizedBox(
      heightFactor: .88,
      child: Container(
        decoration: const BoxDecoration(
          color: InstantStudyApp.paper,
          borderRadius: BorderRadius.vertical(top: Radius.circular(2)),
        ),
        child: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 34),
            children: [
              Row(
                children: [
                  const _InstantOrb(
                    primary: InstantStudyApp.green,
                    secondary: InstantStudyApp.orange,
                    size: 30,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    context.tr('knowledgeState'),
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Text(
                '${mastery.round()}%',
                style: const TextStyle(
                  fontSize: 94,
                  height: .82,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -6,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                context.tr('overallMastery'),
                style: const TextStyle(
                  color: InstantStudyApp.muted,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 36),
              _MetricLine(
                label: context.tr('retention'),
                value: '${retention.round()}%',
                accent: InstantStudyApp.green,
              ),
              _MetricLine(
                label: context.tr('studyStreak'),
                value: context.tr('days', {'count': data['streakDays'] ?? 0}),
                accent: InstantStudyApp.electric,
              ),
              _MetricLine(
                label: context.tr('dueNow'),
                value: '${data['dueNow'] ?? 0}',
                accent: InstantStudyApp.orange,
              ),
              _MetricLine(
                label: context.tr('activeRecall'),
                value: context.tr('answers', {'count': data['attempts'] ?? 0}),
                accent: InstantStudyApp.ink,
              ),
              const SizedBox(height: 34),
              _SectionRule(label: context.tr('whatNeedsYou')),
              if (weak.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Text(
                    context.tr('noWeak'),
                    style: const TextStyle(color: InstantStudyApp.muted),
                  ),
                )
              else
                ...weak.take(5).map(
                      (item) => _ConceptLine(
                        label: item['label']?.toString() ?? 'Concept',
                        mastery:
                            ((item['mastery'] as num?)?.toDouble() ?? 0) * 100,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricLine extends StatelessWidget {
  const _MetricLine({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 62),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: Color(0x2E11110F)),
        ),
      ),
      child: Row(
        children: [
          Container(width: 7, height: 7, color: accent),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 12),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: InstantStudyApp.muted,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _ConceptLine extends StatelessWidget {
  const _ConceptLine({
    required this.label,
    required this.mastery,
  });

  final String label;
  final double mastery;

  @override
  Widget build(BuildContext context) {
    final normalized = mastery.clamp(0, 100) / 100;
    final accent = mastery < 50
        ? InstantStudyApp.orange
        : mastery < 75
            ? const Color(0xFFD1AD5E)
            : InstantStudyApp.green;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 13),
            ),
          ),
          SizedBox(
            width: 110,
            child: LinearProgressIndicator(
              value: normalized,
              minHeight: 2,
              backgroundColor: InstantStudyApp.paper3,
              color: accent,
              borderRadius: BorderRadius.zero,
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 38,
            child: Text(
              '${mastery.round()}%',
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: InstantStudyApp.muted,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PodcastScene extends StatelessWidget {
  const _PodcastScene({
    required this.title,
    required this.estimatedMinutes,
    required this.segments,
    required this.playing,
    required this.onPlay,
  });

  final String title;
  final int estimatedMinutes;
  final List<Map<String, dynamic>> segments;
  final bool playing;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: .88,
      child: Container(
        color: InstantStudyApp.ink,
        child: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 26, 22, 34),
            children: [
              Text(
                context.tr('podcastKicker'),
                style: const TextStyle(
                  color: InstantStudyApp.orangeSoft,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFFEFEDE7),
                  fontSize: 46,
                  height: .92,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -2.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                context.tr('podcastMeta', {'minutes': estimatedMinutes}),
                style: const TextStyle(color: Color(0xFF8F8A81)),
              ),
              const SizedBox(height: 22),
              _SignalButton(
                label: playing ? context.tr('stopPodcast') : context.tr('playPodcast'),
                onPressed: onPlay,
                light: true,
              ),
              const SizedBox(height: 30),
              ...segments.map((segment) {
                final coach = segment['speaker']?.toString() == 'Coach';
                return Container(
                  margin: const EdgeInsets.only(bottom: 1),
                  padding: const EdgeInsets.all(16),
                  color: coach
                      ? InstantStudyApp.orange
                      : const Color(0xFF191917),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        segment['speaker']?.toString().toUpperCase() ?? 'HOST',
                        style: TextStyle(
                          color: coach
                              ? InstantStudyApp.ink
                              : const Color(0xFF77736B),
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        segment['text']?.toString() ?? '',
                        style: TextStyle(
                          color: coach
                              ? InstantStudyApp.ink
                              : const Color(0xFFC9C5BB),
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudyGameScene extends StatefulWidget {
  const _StudyGameScene({required this.game});

  final Map<String, dynamic> game;

  @override
  State<_StudyGameScene> createState() => _StudyGameSceneState();
}

class _StudyGameSceneState extends State<_StudyGameScene> {
  final Set<String> _matched = {};
  final List<String> _open = [];
  int _moves = 0;
  bool _locked = false;

  List<Map<String, dynamic>> get _cards {
    final raw = widget.game['cards'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  void _choose(Map<String, dynamic> card) {
    if (_locked) return;
    final id = card['id']?.toString() ?? '';
    final pair = card['pairId']?.toString() ?? '';
    if (!id.isNotEmpty || _open.contains(id) || _matched.contains(pair)) return;

    setState(() => _open.add(id));
    if (_open.length < 2) return;

    setState(() => _moves += 1);
    final first = _cards.firstWhere((item) => item['id']?.toString() == _open[0]);
    final second = _cards.firstWhere((item) => item['id']?.toString() == _open[1]);
    final match =
        first['pairId'] == second['pairId'] && first['kind'] != second['kind'];

    if (match) {
      setState(() {
        _matched.add(pair);
        _open.clear();
      });
      return;
    }

    setState(() => _locked = true);
    Future<void>.delayed(const Duration(milliseconds: 650), () {
      if (!mounted) return;
      setState(() {
        _open.clear();
        _locked = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final pairCount = (widget.game['pairCount'] as num?)?.toInt() ?? 0;
    final complete = pairCount > 0 && _matched.length == pairCount;

    return FractionallySizedBox(
      heightFactor: .9,
      child: Container(
        color: InstantStudyApp.paper,
        child: SafeArea(
          top: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 24, 18, 34),
            children: [
              Text(
                context.tr('gameKicker'),
                style: const TextStyle(
                  color: InstantStudyApp.orange,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                complete
                    ? context.tr('matchedMoves', {'moves': _moves})
                    : context.tr('matchKnowledge'),
                style: const TextStyle(
                  fontSize: 44,
                  height: .92,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -2.4,
                ),
              ),
              const SizedBox(height: 22),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _cards.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 1,
                  mainAxisSpacing: 1,
                  childAspectRatio: .86,
                ),
                itemBuilder: (context, index) {
                  final card = _cards[index];
                  final id = card['id']?.toString() ?? '';
                  final pair = card['pairId']?.toString() ?? '';
                  final open = _open.contains(id) || _matched.contains(pair);
                  final matched = _matched.contains(pair);
                  return InkWell(
                    onTap: matched ? null : () => _choose(card),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      color: matched
                          ? InstantStudyApp.green
                          : open
                              ? InstantStudyApp.paper2
                              : InstantStudyApp.ink,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            open
                                ? (card['kind']?.toString() ?? 'card').toUpperCase()
                                : context.tr('recall'),
                            style: TextStyle(
                              color: open
                                  ? InstantStudyApp.orange
                                  : const Color(0xFF77736B),
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            open ? card['text']?.toString() ?? '' : context.tr('reveal'),
                            style: TextStyle(
                              color: open
                                  ? InstantStudyApp.ink
                                  : const Color(0xFFEFEDE7),
                              height: 1.3,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GrainLayer extends StatelessWidget {
  const _GrainLayer();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _GrainPainter(),
      child: const SizedBox.expand(),
    );
  }
}

class _GrainPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = InstantStudyApp.ink.withValues(alpha: .035)
      ..strokeWidth = .7;

    const count = 520;
    for (var index = 0; index < count; index++) {
      final xSeed = ((index * 73 + 19) % 997) / 997;
      final ySeed = ((index * 151 + 41) % 991) / 991;
      canvas.drawCircle(
        Offset(size.width * xSeed, size.height * ySeed),
        .35,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GrainPainter oldDelegate) => false;
}
