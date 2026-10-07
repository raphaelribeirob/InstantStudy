import 'dart:convert';
import 'dart:io';

class InstantStudyApi {
  InstantStudyApi({
    String? baseUrl,
  }) : baseUrl = (baseUrl ??
            const String.fromEnvironment(
              'INSTANTSTUDY_BFF_URL',
              defaultValue: 'https://instantstudy-web.vercel.app',
            ))
        .replaceAll(RegExp(r'/+$'), '');

  final String baseUrl;

  Future<Map<String, dynamic>> _post(Map<String, dynamic> payload) async {
    final client = HttpClient();
    try {
      final request = await client.postUrl(Uri.parse(baseUrl + '/api/study'));
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.write(jsonEncode(payload));

      final response = await request.close().timeout(const Duration(seconds: 45));
      final text = await utf8.decoder.bind(response).join();
      final body = text.isEmpty
          ? <String, dynamic>{}
          : (jsonDecode(text) as Map<String, dynamic>);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw InstantStudyApiException(
          body['message']?.toString() ??
              body['error']?.toString() ??
              'Request failed (' + response.statusCode.toString() + ')',
        );
      }

      return body;
    } finally {
      client.close(force: true);
    }
  }

  Future<Map<String, dynamic>> prepare({
    required String contentText,
    required String mode,
    required String learnerId,
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
