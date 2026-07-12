import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/roles.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';

class TrainingsScreen extends StatefulWidget {
  const TrainingsScreen({super.key});
  @override
  State<TrainingsScreen> createState() => _TrainingsScreenState();
}

class _TrainingsScreenState extends State<TrainingsScreen>
    with SingleTickerProviderStateMixin {
  List mine = [], courses = [], directory = [];
  late TabController _tc;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: isHrOrAdmin ? 2 : 1, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      mine = asList(await ApiClient.get('/trainings/mine'));
    } catch (_) {}
    if (isHrOrAdmin) {
      try {
        courses = asList(await ApiClient.get('/trainings/courses'));
      } catch (_) {}
      try {
        directory = asList(await ApiClient.get('/employees/directory'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _createCourse() async {
    final title = TextEditingController();
    final desc = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create course'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: title,
              decoration: const InputDecoration(labelText: 'Title')),
          TextField(
              controller: desc,
              decoration: const InputDecoration(labelText: 'Description')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/trainings/courses',
                    {'title': title.text, 'description': desc.text});
                if (mounted) showOk(context, 'Course created');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Future<void> _assign(dynamic course) async {
    if (directory.isEmpty) return;
    String? empId = directory.first['id'] as String?;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Assign ${course['title']}'),
        content: DropdownButtonFormField(
          value: empId,
          items: [
            for (final e in directory)
              DropdownMenuItem(
                  value: e['id'] as String, child: Text(employeeLabel(e)))
          ],
          onChanged: (v) => empId = v,
          decoration: const InputDecoration(labelText: 'Employee'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post(
                    '/trainings/courses/${course['id']}/assign', {
                  'employeeIds': [empId]
                });
                if (mounted) showOk(context, 'Assigned');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Assign'),
          ),
        ],
      ),
    );
  }

  Widget _mineTab() => RefreshIndicator(
        onRefresh: _load,
        child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 12),
            children: [
              for (final a in mine)
                SectionCard(
                  title: a['course']['title'].toString(),
                  trailing: StatusBadge(a['status'].toString()),
                  child: Column(children: [
                    for (final v in (a['course']['videos'] as List))
                      RowTile(
                        title:
                            '${v['title']} (${v['durationSeconds']}s${v['noSkip'] == true ? ', no-skip' : ''})',
                        subtitle:
                            '${v['progress']?['watchedSeconds'] ?? 0}s watched'
                            '${v['progress']?['completed'] == true ? ' · completed' : ''}',
                        trailing: v['progress']?['completed'] == true
                            ? const Icon(Icons.check_circle,
                                color: E360Theme.success)
                            : FilledButton(
                                onPressed: () async {
                                  await Navigator.of(context).push(
                                      MaterialPageRoute(
                                          builder: (_) => PlayerScreen(
                                              video:
                                                  v as Map<String, dynamic>)));
                                  _load();
                                },
                                child: const Text('Watch')),
                      ),
                    for (final q in (a['course']['quizzes'] as List? ?? []))
                      RowTile(
                        title: q['title'].toString(),
                        subtitle: 'Pass ≥ ${q['passingScore']}%',
                        trailing: OutlinedButton(
                          onPressed: () async {
                            await Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => QuizScreen(
                                    quiz: q as Map<String, dynamic>)));
                            _load();
                          },
                          child: const Text('Take test'),
                        ),
                      ),
                  ]),
                ),
              if (mine.isEmpty)
                const Padding(
                    padding: EdgeInsets.all(24),
                    child: EmptyState('No trainings assigned to you.')),
            ]),
      );

  @override
  Widget build(BuildContext context) {
    if (!isHrOrAdmin) return _mineTab();
    return Column(
      children: [
        Material(
          color: Theme.of(context).colorScheme.surface,
          child: Row(children: [
            Expanded(
                child: TabBar(controller: _tc, tabs: const [
              Tab(text: 'My trainings'),
              Tab(text: 'Courses')
            ])),
            if (isHrOrAdmin)
              IconButton(icon: const Icon(Icons.add), onPressed: _createCourse),
          ]),
        ),
        Expanded(
          child: TabBarView(
            controller: _tc,
            children: [
              _mineTab(),
              RefreshIndicator(
                onRefresh: _load,
                child: courses.isEmpty
                    ? ListView(children: const [EmptyState('No courses.')])
                    : ListView.builder(
                        itemCount: courses.length,
                        itemBuilder: (_, i) {
                          final c = courses[i];
                          return Card(
                            child: ListTile(
                              title: Text(str(c['title'])),
                              subtitle: Text(str(c['description'])),
                              trailing: TextButton(
                                  onPressed: () => _assign(c),
                                  child: const Text('Assign')),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class PlayerScreen extends StatefulWidget {
  final Map<String, dynamic> video;
  const PlayerScreen({super.key, required this.video});
  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  Timer? timer;
  int pos = 0;
  bool done = false;
  int lastBeat = 0;

  int get duration => (widget.video['durationSeconds'] as num).toInt();
  bool get noSkip => widget.video['noSkip'] == true;

  @override
  void initState() {
    super.initState();
    pos = ((widget.video['progress']?['watchedSeconds'] ?? 0) as num).toInt();
    done = widget.video['progress']?['completed'] == true;
    _play();
  }

  void _play() {
    timer ??= Timer.periodic(const Duration(seconds: 1), (_) async {
      if (!mounted || done) return;
      setState(() => pos = pos + 1 > duration ? duration : pos + 1);
      if (pos - lastBeat >= 5 || pos >= duration) {
        lastBeat = pos;
        try {
          final p = await ApiClient.post(
              '/trainings/videos/${widget.video['id']}/progress',
              {'positionSeconds': pos});
          if (p['completed'] == true && mounted) {
            setState(() => done = true);
            timer?.cancel();
            timer = null;
          }
        } catch (_) {}
      }
    });
  }

  void _pause() {
    timer?.cancel();
    timer = null;
    setState(() {});
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.video['title'].toString()),
        automaticallyImplyLeading: !noSkip || done || timer == null,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (noSkip)
            const Text(
                'Mandatory video — skipping is disabled.\nWatch time is verified by the server.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12)),
          const SizedBox(height: 24),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
                value: duration > 0 ? pos / duration : 0, minHeight: 18),
          ),
          const SizedBox(height: 12),
          Text('$pos s / $duration s',
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          if (done)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Completed',
                  style: TextStyle(
                      color: E360Theme.success, fontWeight: FontWeight.w700)),
            ),
          const SizedBox(height: 24),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            if (!done)
              FilledButton.icon(
                icon: Icon(timer != null ? Icons.pause : Icons.play_arrow),
                onPressed: () => timer != null ? _pause() : _play(),
                label: Text(timer != null ? 'Pause' : 'Play'),
              ),
            const SizedBox(width: 12),
            OutlinedButton(
              onPressed: (noSkip && !done && timer != null)
                  ? null
                  : () => Navigator.pop(context),
              child: Text(done ? 'Done' : 'Close'),
            ),
          ]),
        ]),
      ),
    );
  }
}

class QuizScreen extends StatefulWidget {
  final Map<String, dynamic> quiz;
  const QuizScreen({super.key, required this.quiz});
  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int index = 0;
  late List<int?> answers;
  Map<String, dynamic>? result;

  List get questions => widget.quiz['questions'] as List;

  @override
  void initState() {
    super.initState();
    answers = List.filled(questions.length, null);
  }

  Future<void> _submit() async {
    try {
      final r = await ApiClient.post(
          '/trainings/quizzes/${widget.quiz['id']}/attempt',
          {'answers': answers});
      setState(() => result = r as Map<String, dynamic>);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = questions[index] as Map<String, dynamic>;
    return Scaffold(
      appBar: AppBar(title: Text(widget.quiz['title'].toString())),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: result != null
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                    Text('Score: ${result!['score']}%',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontSize: 32, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text(
                        result!['passed'] == true
                            ? 'PASSED'
                            : 'NOT PASSED — you can retry',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: result!['passed'] == true
                                ? E360Theme.success
                                : E360Theme.danger)),
                    const SizedBox(height: 24),
                    FilledButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Done')),
                  ])
            : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('Question ${index + 1} of ${questions.length}',
                    style: TextStyle(color: Theme.of(context).hintColor)),
                const SizedBox(height: 8),
                Text(q['q'].toString(),
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                for (int i = 0; i < (q['options'] as List).length; i++)
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 5),
                    child: RadioListTile<int>(
                      value: i,
                      groupValue: answers[index],
                      onChanged: (v) => setState(() => answers[index] = v),
                      title: Text((q['options'] as List)[i].toString()),
                    ),
                  ),
                const Spacer(),
                Row(children: [
                  if (index > 0)
                    OutlinedButton(
                        onPressed: () => setState(() => index--),
                        child: const Text('Back')),
                  const Spacer(),
                  index < questions.length - 1
                      ? FilledButton(
                          onPressed: answers[index] == null
                              ? null
                              : () => setState(() => index++),
                          child: const Text('Next'))
                      : FilledButton(
                          onPressed: answers[index] == null ? null : _submit,
                          child: const Text('Submit test')),
                ]),
              ]),
      ),
    );
  }
}
