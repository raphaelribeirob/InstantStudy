import 'package:flutter/material.dart';

/// Native study-set editor: text changes are returned to the parent for an
/// authenticated/owner-scoped server save. No optimistic local-only success.
class NativeMaterialEditor extends StatefulWidget {
  const NativeMaterialEditor({
    super.key, required this.title, required this.assets,
  });
  final String title;
  final Map<String, dynamic> assets;

  @override
  State<NativeMaterialEditor> createState() => _NativeMaterialEditorState();
}

class _CardFields {
  _CardFields(Map<String, dynamic> card)
      : id = card['id']?.toString() ?? UniqueKey().toString(),
        concept = TextEditingController(text: card['concept']?.toString() ?? ''),
        front = TextEditingController(text: card['front']?.toString() ?? ''),
        back = TextEditingController(text: card['back']?.toString() ?? '');
  final String id;
  final TextEditingController concept, front, back;
  void dispose() {
    concept.dispose();
    front.dispose();
    back.dispose();
  }
}

class _NativeMaterialEditorState extends State<NativeMaterialEditor> {
  late final TextEditingController title, summary, outline;
  late List<_CardFields> cards;
  String? message;

  @override
  void initState() {
    super.initState();
    title = TextEditingController(text: widget.title);
    summary = TextEditingController(text: widget.assets['summary']?.toString() ?? '');
    outline = TextEditingController(
      text: (widget.assets['outline'] is List
          ? widget.assets['outline'] as List : <dynamic>[])
          .map((value) => value.toString()).join('\n'),
    );
    cards = (widget.assets['flashcards'] is List
        ? widget.assets['flashcards'] as List : <dynamic>[])
        .whereType<Map>()
        .map((item) => _CardFields(Map<String, dynamic>.from(item)))
        .toList();
  }

  @override
  void dispose() {
    title.dispose();
    summary.dispose();
    outline.dispose();
    for (final card in cards) { card.dispose(); }
    super.dispose();
  }

  void save() {
    final lines = outline.text.split(RegExp(r'\r?\n'))
        .map((line) => line.trim()).where((line) => line.isNotEmpty).toList();
    if (title.text.trim().isEmpty || summary.text.trim().isEmpty ||
        lines.isEmpty || cards.isEmpty ||
        cards.any((card) => card.front.text.trim().length < 5 ||
          card.back.text.trim().isEmpty || card.concept.text.trim().isEmpty)) {
      setState(() => message = 'Complete the title, summary, outline and all cards.');
      return;
    }
    Navigator.of(context).pop(<String, dynamic>{
      'title': title.text.trim(),
      'summary': summary.text.trim(),
      'outline': lines,
      'flashcards': cards.map((card) => <String, dynamic>{
        'id': card.id,
        'front': card.front.text.trim(),
        'back': card.back.text.trim(),
        'concept': card.concept.text.trim(),
        'sourceExcerpt': card.back.text.trim(),
      }).toList(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFC),
      appBar: AppBar(
        title: const Text('Edit study material'),
        backgroundColor: const Color(0xFFFDFCFC),
      ),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(18), children: [
          TextField(controller: title, maxLength: 200,
            decoration: const InputDecoration(labelText: 'Title')),
          TextField(controller: summary, maxLines: 5, maxLength: 12000,
            decoration: const InputDecoration(labelText: 'Study guide summary')),
          TextField(controller: outline, maxLines: 6,
            decoration: const InputDecoration(labelText: 'Outline (one idea per line)')),
          const SizedBox(height: 20),
          const Text('Flashcards', style: TextStyle(fontSize: 20)),
          ...cards.asMap().entries.map((entry) {
            final i = entry.key, card = entry.value;
            return Card(
              key: ValueKey(card.id),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(children: [
                  Text('Card ${i+1}'),
                  TextField(controller: card.concept, maxLength: 200,
                    decoration: const InputDecoration(labelText: 'Concept')),
                  TextField(controller: card.front, maxLength: 1000,
                    decoration: const InputDecoration(labelText: 'Question')),
                  TextField(controller: card.back, maxLength: 2000,
                    decoration: const InputDecoration(labelText: 'Answer')),
                  Wrap(spacing: 6, children: [
                    IconButton(tooltip: 'Move up', icon: const Icon(Icons.arrow_upward),
                      onPressed: i == 0 ? null : () => setState(() {
                        final current=cards.removeAt(i);cards.insert(i-1,current);
                      })),
                    IconButton(tooltip: 'Move down', icon: const Icon(Icons.arrow_downward),
                      onPressed: i == cards.length-1 ? null : () => setState(() {
                        final current=cards.removeAt(i);cards.insert(i+1,current);
                      })),
                    IconButton(tooltip: 'Remove card', icon: const Icon(Icons.delete_outline),
                      onPressed: cards.length <= 1 ? null : () => setState(() {
                        final removed=cards.removeAt(i);
                        // Allow the closing frame to dispose after the widget is removed.
                        WidgetsBinding.instance.addPostFrameCallback((_) => removed.dispose());
                      })),
                  ]),
                ]),
              ),
            );
          }),
          TextButton.icon(icon: const Icon(Icons.add), label: const Text('Add flashcard'),
            onPressed: cards.length>=100 ? null : ()=>setState(() {
              cards.add(_CardFields(<String,dynamic>{
                'id':'user-${DateTime.now().microsecondsSinceEpoch}',
              }));
            })),
          if(message!=null) Text(message!,style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 18),
          FilledButton(onPressed: save, child: const Text('Review and save changes')),
        ]),
      )),
    );
  }
}
