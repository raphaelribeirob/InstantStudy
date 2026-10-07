import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

const supportedInstantStudyLocales = <Locale>[
  Locale('en'),
  Locale('pt', 'BR'),
];

class AppStrings {
  const AppStrings(this.locale);

  final Locale locale;

  static const delegate = _AppStringsDelegate();

  static AppStrings of(BuildContext context) {
    final strings = Localizations.of<AppStrings>(context, AppStrings);
    assert(strings != null, 'AppStrings not found in widget tree.');
    return strings!;
  }

  String tr(String key, [Map<String, Object?> values = const {}]) {
    final language = locale.languageCode == 'pt' ? 'pt-BR' : 'en';
    var value = _messages[language]?[key] ?? _messages['en']?[key] ?? key;
    for (final entry in values.entries) {
      value = value.replaceAll('{{${entry.key}}}', '${entry.value ?? ''}');
    }
    return value;
  }
}

extension InstantStudyTranslations on BuildContext {
  String tr(String key, [Map<String, Object?> values = const {}]) {
    return AppStrings.of(this).tr(key, values);
  }
}

class _AppStringsDelegate extends LocalizationsDelegate<AppStrings> {
  const _AppStringsDelegate();

  @override
  bool isSupported(Locale locale) =>
      locale.languageCode == 'en' || locale.languageCode == 'pt';

  @override
  Future<AppStrings> load(Locale locale) {
    return SynchronousFuture(AppStrings(locale));
  }

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppStrings> old) => false;
}

const _messages = <String, Map<String, String>>{
  'en': {
    'product': 'InstantStudy™',
    'language': 'Language',
    'insights': 'Insights',
    'podcast': 'Podcast',
    'studyGame': 'Study Game',
    'futureLearning': 'THE FUTURE OF LEARNING',
    'learnAnything': 'Learn from\nanything.',
    'entryBody': 'One material becomes a living knowledge state: practice, testing, mastery and right-time review.',
    'yourMaterial': 'YOUR MATERIAL',
    'titleOptional': 'Title (optional)',
    'pasteMaterial': 'Paste notes, a reading or lecture transcript…',
    'importMaterial': 'Import file, audio, photo or handwritten notes',
    'studyMode': 'STUDY MODE',
    'learn': 'LEARN',
    'quiz': 'QUIZ',
    'test': 'TEST',
    'review': 'REVIEW',
    'questions': 'Questions',
    'time': 'Time',
    'start': 'Start InstantStudy',
    'building': 'Building…',
    'evaluating': 'Evaluating…',
    'submitAnswer': 'Submit answer',
    'typeAnswer': 'Type your answer…',
    'knowledgeUpdated': 'KNOWLEDGE STATE UPDATED',
    'complete': 'Complete',
    'studyAnother': 'Study another source',
    'questionProgress': 'QUESTION {{current}} OF {{total}} · {{type}}',
    'podcastKicker': 'INSTANTSTUDY PODCAST',
    'podcastMeta': '~{{minutes}} min · two-speaker grounded review',
    'playPodcast': 'Play podcast',
    'stopPodcast': 'Stop podcast',
    'gameKicker': 'ACTIVE RECALL GAME',
    'matchKnowledge': 'Match the knowledge.',
    'matchedMoves': 'Matched in {{moves}} moves.',
    'recall': 'RECALL',
    'reveal': 'Reveal',
    'knowledgeState': 'KNOWLEDGE STATE',
    'overallMastery': 'overall mastery',
    'retention': 'Retention',
    'studyStreak': 'Study streak',
    'dueNow': 'Due now',
    'activeRecall': 'Active recall',
    'days': '{{count}} days',
    'answers': '{{count}} answers',
    'whatNeedsYou': 'WHAT NEEDS YOU',
    'noWeak': 'Complete a study session to reveal weak concepts.',
    'saveFirstPodcast': 'Save or import material before opening Podcast.',
    'saveFirstGame': 'Save or import material before opening Study Game.',
    'uploadLimit': 'Flutter imports are limited to 2.5 MB per file in this release.',
    'couldNotRead': 'Could not read the selected file.',
    'invalidImport': 'Material import returned an invalid payload.',
  },
  'pt-BR': {
    'product': 'InstantStudy™',
    'language': 'Idioma',
    'insights': 'Insights',
    'podcast': 'Podcast',
    'studyGame': 'Jogo de Estudo',
    'futureLearning': 'O FUTURO DO APRENDIZADO',
    'learnAnything': 'Aprenda com\nqualquer coisa.',
    'entryBody': 'Um único material se transforma em um estado vivo de conhecimento: prática, testes, domínio e revisão no momento certo.',
    'yourMaterial': 'SEU MATERIAL',
    'titleOptional': 'Título (opcional)',
    'pasteMaterial': 'Cole notas, uma leitura ou transcrição de aula…',
    'importMaterial': 'Importar arquivo, áudio, foto ou anotação manuscrita',
    'studyMode': 'MODO DE ESTUDO',
    'learn': 'APRENDER',
    'quiz': 'QUIZ',
    'test': 'SIMULADO',
    'review': 'REVISAR',
    'questions': 'Questões',
    'time': 'Tempo',
    'start': 'Começar InstantStudy',
    'building': 'Criando…',
    'evaluating': 'Avaliando…',
    'submitAnswer': 'Enviar resposta',
    'typeAnswer': 'Digite sua resposta…',
    'knowledgeUpdated': 'ESTADO DE CONHECIMENTO ATUALIZADO',
    'complete': 'Concluído',
    'studyAnother': 'Estudar outra fonte',
    'questionProgress': 'QUESTÃO {{current}} DE {{total}} · {{type}}',
    'podcastKicker': 'PODCAST INSTANTSTUDY',
    'podcastMeta': '~{{minutes}} min · revisão com duas vozes baseada no material',
    'playPodcast': 'Reproduzir podcast',
    'stopPodcast': 'Parar podcast',
    'gameKicker': 'JOGO DE RECORDAÇÃO ATIVA',
    'matchKnowledge': 'Combine o conhecimento.',
    'matchedMoves': 'Combinado em {{moves}} movimentos.',
    'recall': 'RECORDAR',
    'reveal': 'Revelar',
    'knowledgeState': 'ESTADO DE CONHECIMENTO',
    'overallMastery': 'domínio geral',
    'retention': 'Retenção',
    'studyStreak': 'Sequência de estudo',
    'dueNow': 'Para revisar agora',
    'activeRecall': 'Recordação ativa',
    'days': '{{count}} dias',
    'answers': '{{count}} respostas',
    'whatNeedsYou': 'O QUE PRECISA DE VOCÊ',
    'noWeak': 'Conclua uma sessão de estudo para revelar conceitos fracos.',
    'saveFirstPodcast': 'Salve ou importe um material antes de abrir o Podcast.',
    'saveFirstGame': 'Salve ou importe um material antes de abrir o Jogo de Estudo.',
    'uploadLimit': 'Os envios no Flutter estão limitados a 2,5 MB por arquivo nesta versão.',
    'couldNotRead': 'Não foi possível ler o arquivo selecionado.',
    'invalidImport': 'A importação retornou dados inválidos.',
  },
};
