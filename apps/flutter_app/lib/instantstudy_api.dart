import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class InstantStudyApi {
  InstantStudyApi({String? baseUrl})
      : baseUrl = (baseUrl ?? _defaultBaseUrl())
            .replaceAll(RegExp(r'/+$'), '');

  // Flutter Web uses same-origin BFF; Android/iOS use configured public URL.
  static String _defaultBaseUrl() {
    const configured = String.fromEnvironment('INSTANTSTUDY_BFF_URL');
    if (configured.isNotEmpty) return configured;
    return kIsWeb ? Uri.base.origin : 'https://instantstudy-web.vercel.app';
  }

  final String baseUrl;

  Future<Map<String, dynamic>> _post(Map<String, dynamic> payload) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/api/study'),
          headers: {'content-type': 'application/json', 'accept': 'application/json'},
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 45));
    final Map<String, dynamic> body;
    try {
      body = response.body.isEmpty
          ? <String, dynamic>{}
          : Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    } catch (_) {
      throw InstantStudyApiException('The study server returned an invalid response.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw InstantStudyApiException(
        body['message']?.toString() ??
            body['error']?.toString() ??
            'Request failed (${response.statusCode})',
      );
    }
    return body;
  }

  Future<Map<String, dynamic>> prepare({
    required String contentText,
    required String mode,
    required String learnerId,
    String? locale,
    String? title,
    int? maxQuestions,
    int? testDurationMinutes,
    List<String>? testQuestionTypes,
  }) {
    return _post({
      'action': 'prepare',
      'contentText': contentText,
      'title': title,
      'mode': mode,
      'learnerId': learnerId,
      'locale': locale,
      'maxQuestions': maxQuestions,
      'testDurationMinutes': testDurationMinutes,
      'testQuestionTypes': testQuestionTypes,
    });
  }

  Future<Map<String, dynamic>> importMaterial({
    required String learnerId,
    String? title,
    String? contentText,
    required String sourceType,
    List<Map<String, dynamic>> files = const [],
  }) {
    return _post({
      'action': 'material_import',
      'learnerId': learnerId,
      'title': title,
      'contentText': contentText,
      'sourceType': sourceType,
      'files': files,
    });
  }

  Future<Map<String, dynamic>> insights({
    required String learnerId,
  }) {
    return _post({
      'action': 'insights',
      'learnerId': learnerId,
    });
  }

  Future<Map<String, dynamic>> audioStudy({
    required String learnerId,
    required String materialId,
    String? locale,
  }) {
    return _post({
      'action': 'audio_study',
      'learnerId': learnerId,
      'materialId': materialId,
      'locale': locale,
    });
  }

  Future<Map<String, dynamic>> studyGame({
    required String learnerId,
    required String materialId,
  }) {
    return _post({
      'action': 'study_game',
      'learnerId': learnerId,
      'materialId': materialId,
    });
  }

  Future<Map<String, dynamic>> createRoom({
    required String learnerId,
    required String materialId,
    required String displayName,
  }) {
    return _post({
      'action': 'room_create',
      'learnerId': learnerId,
      'materialId': materialId,
      'displayName': displayName,
    });
  }

  Future<Map<String, dynamic>> joinRoom({
    required String learnerId,
    required String code,
    required String displayName,
  }) {
    return _post({
      'action': 'room_join',
      'learnerId': learnerId,
      'code': code,
      'displayName': displayName,
    });
  }

  Future<Map<String, dynamic>> answer({
    required String studySessionId,
    required String conceptId,
    required String userAnswer,
  }) {
    return _post({
      'action': 'answer',
      'studySessionId': studySessionId,
      'conceptId': conceptId,
      'userAnswer': userAnswer,
    });
  }

  Future<Map<String, dynamic>> ask({
    required String contentText,
    required String question,
  }) {
    return _post({
      'action': 'ask',
      'contentText': contentText,
      'question': question,
    });
  }
}

class InstantStudyApiException implements Exception {
  InstantStudyApiException(this.message);
  final String message;

  @override
  String toString() => message;
}
