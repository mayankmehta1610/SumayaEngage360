import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/roles.dart';
import '../../widgets/api_list_screen.dart';
import '../../widgets/common.dart';
import '../../widgets/file_helper.dart';
import '../../widgets/report_view.dart';
import '../../widgets/tabbed_api_screen.dart';

// ── Recognition ──────────────────────────────────────────────────────────────

class RecognitionScreen extends StatefulWidget {
  const RecognitionScreen({super.key});
  @override
  State<RecognitionScreen> createState() => _RecognitionScreenState();
}

class _RecognitionScreenState extends State<RecognitionScreen> {
  List feed = [], directory = [], badges = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      feed = asList(await ApiClient.get('/recognitions/feed'));
    } catch (_) {}
    try {
      directory = asList(await ApiClient.get('/employees/directory'));
    } catch (_) {}
    try {
      badges = asList(await ApiClient.get('/recognition-badges'));
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _give() async {
    if (directory.isEmpty) return;
    String? receiverId = directory.first['id'] as String;
    String badge =
        badges.isNotEmpty ? str(badges.first['name']) : 'Star Performer';
    final message = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Give recognition'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField(
            value: receiverId,
            items: [
              for (final e in directory)
                DropdownMenuItem(
                    value: e['id'] as String, child: Text(employeeLabel(e)))
            ],
            onChanged: (v) => receiverId = v,
            decoration: const InputDecoration(labelText: 'Colleague'),
          ),
          DropdownButtonFormField(
            value: badge,
            items: [
              for (final b in badges)
                DropdownMenuItem(
                    value: str(b['name']), child: Text(str(b['name']))),
            ],
            onChanged: (v) => badge = v as String,
            decoration: const InputDecoration(labelText: 'Badge'),
          ),
          TextField(
              controller: message,
              decoration: const InputDecoration(labelText: 'Message')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/recognitions', {
                  'receiverId': receiverId,
                  'badge': badge,
                  'message': message.text,
                  'points': 50
                });
                if (mounted) showOk(context, 'Recognition sent');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recognition'), actions: [
        if (directory.isNotEmpty)
          IconButton(icon: const Icon(Icons.add), onPressed: _give),
      ]),
      body: RefreshIndicator(
        onRefresh: _load,
        child: feed.isEmpty
            ? ListView(children: const [
                EmptyState('No recognitions yet.',
                    icon: Icons.emoji_events_outlined)
              ])
            : ListView.builder(
                itemCount: feed.length,
                itemBuilder: (_, i) {
                  final x = feed[i];
                  return Card(
                    child: ListTile(
                      title: Text(
                          '${x['badge']} — ${employeeLabel(x['receiver'])}'),
                      subtitle: Text(str(x['message'])),
                      trailing: Text('+${x['points']}',
                          style: const TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ── Surveys ──────────────────────────────────────────────────────────────────

class SurveysScreen extends StatefulWidget {
  const SurveysScreen({super.key});
  @override
  State<SurveysScreen> createState() => _SurveysScreenState();
}

class _SurveysScreenState extends State<SurveysScreen> {
  List surveys = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      surveys = asList(await ApiClient.get('/surveys/open/mine'));
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Surveys')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: surveys.isEmpty
            ? ListView(children: const [
                EmptyState('No open surveys.', icon: Icons.poll_outlined)
              ])
            : ListView.builder(
                itemCount: surveys.length,
                itemBuilder: (_, i) {
                  final s = surveys[i];
                  return Card(
                    child: ListTile(
                      title: Text(str(s['title'])),
                      subtitle: Text(str(s['type'])),
                      trailing: s['alreadyAnswered'] == true
                          ? const StatusBadge('DONE')
                          : FilledButton(
                              onPressed: () => _answer(s),
                              child: const Text('Answer')),
                    ),
                  );
                },
              ),
      ),
    );
  }

  Future<void> _answer(Map s) async {
    final values = <String, dynamic>{};
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(str(s['title'])),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final q in (s['questions'] as List? ?? []))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: q['kind'] == 'SCALE'
                        ? Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                                Text(str(q['q'])),
                                Slider(
                                  value:
                                      ((values[q['q']] ?? 5) as num).toDouble(),
                                  min: 0,
                                  max: 10,
                                  divisions: 10,
                                  onChanged: (v) =>
                                      setD(() => values[q['q']] = v.round()),
                                ),
                              ])
                        : TextField(
                            decoration: InputDecoration(labelText: str(q['q'])),
                            onChanged: (v) => values[q['q']] = v,
                          ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/surveys/${s['id']}/respond', {
                    'answers': [
                      for (final q in (s['questions'] as List? ?? []))
                        {
                          'q': q['q'],
                          'value':
                              values[q['q']] ?? (q['kind'] == 'SCALE' ? 5 : '')
                        },
                    ],
                  });
                  if (mounted) showOk(context, 'Submitted');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Expenses ─────────────────────────────────────────────────────────────────

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen>
    with SingleTickerProviderStateMixin {
  List items = [], allItems = [];
  late TabController _tc;

  Future<void> _load() async {
    try {
      items = asList(await ApiClient.get('/expenses/mine'));
    } catch (_) {}
    if (isHrOrAdmin || isManager) {
      try {
        allItems = asList(await ApiClient.get('/expenses'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _tc =
        TabController(length: (isHrOrAdmin || isManager) ? 2 : 1, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _approve(String id) async {
    try {
      await ApiClient.patch('/expenses/$id/approve');
      if (mounted) showOk(context, 'Approved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _create() async {
    final title = TextEditingController();
    final amount = TextEditingController();
    final category = TextEditingController(text: 'TRAVEL');
    final desc = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New expense claim'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: title,
              decoration: const InputDecoration(labelText: 'Claim title')),
          TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount')),
          TextField(
              controller: category,
              decoration: const InputDecoration(labelText: 'Category')),
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
                final claim = await ApiClient.post('/expenses', {
                  'title': title.text.isEmpty ? 'Expense claim' : title.text,
                  'lines': [
                    {
                      'date': DateTime.now().toUtc().toIso8601String(),
                      'category':
                          category.text.isEmpty ? 'GENERAL' : category.text,
                      'amount': num.tryParse(amount.text) ?? 0,
                      if (desc.text.isNotEmpty) 'description': desc.text,
                    },
                  ],
                }) as Map<String, dynamic>;
                await ApiClient.patch('/expenses/${claim['id']}/submit');
                if (mounted) showOk(context, 'Expense submitted');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget list(List data, {bool approve = false}) => data.isEmpty
        ? ListView(children: const [
            EmptyState('No expense claims.', icon: Icons.receipt_long)
          ])
        : ListView.builder(
            itemCount: data.length,
            itemBuilder: (_, i) {
              final e = data[i];
              return Card(
                child: ListTile(
                  title: Text(
                      '${str(e['title'], 'Expense')} — ₹ ${e['totalAmount'] ?? e['amount'] ?? 0}'),
                  subtitle:
                      Text('${(e['lines'] as List?)?.length ?? 0} line(s)'),
                  trailing: approve && e['status'] == 'SUBMITTED'
                      ? IconButton(
                          icon: const Icon(Icons.check_circle,
                              color: Colors.green),
                          onPressed: () => _approve(e['id'].toString()))
                      : StatusBadge(str(e['status'])),
                ),
              );
            },
          );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Expenses'),
        bottom: (isHrOrAdmin || isManager)
            ? TabBar(
                controller: _tc,
                tabs: const [Tab(text: 'Mine'), Tab(text: 'Approve')])
            : null,
      ),
      floatingActionButton: FloatingActionButton(
          onPressed: _create, child: const Icon(Icons.add)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: (isHrOrAdmin || isManager)
            ? TabBarView(
                controller: _tc,
                children: [list(items), list(allItems, approve: true)])
            : list(items),
      ),
    );
  }
}

// ── Goals ────────────────────────────────────────────────────────────────────

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen>
    with SingleTickerProviderStateMixin {
  List kpis = [], mine = [], teamGoals = [], employees = [];
  late TabController _tc;

  Future<void> _load() async {
    try {
      kpis = asList(await ApiClient.get('/goals/kpis'));
    } catch (_) {}
    try {
      mine = asList(await ApiClient.get('/goals/mine'));
    } catch (_) {}
    if (canAssignGoals) {
      try {
        employees = asList(await ApiClient.get(
            isHrOrAdmin ? '/employees/directory' : '/employees/team'));
        teamGoals = asList(await ApiClient.get('/goals'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: canAssignGoals ? 2 : 1, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _bump(dynamic g) async {
    try {
      final p = (g['progress'] as num?)?.toInt() ?? 0;
      await ApiClient.patch('/goals/${g['id']}/progress', {'progress': p + 10});
      if (mounted) showOk(context, 'Progress updated');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _addKpi() async {
    final code = TextEditingController();
    final name = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add KPI'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: code,
              decoration: const InputDecoration(labelText: 'Code')),
          TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post(
                    '/goals/kpis', {'code': code.text, 'name': name.text});
                if (mounted) showOk(context, 'KPI added');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _assign() async {
    if (employees.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    final title = TextEditingController();
    final target = TextEditingController();
    DateTime due = DateTime.now().add(const Duration(days: 90));
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Assign goal'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField(
              value: empId,
              items: [
                for (final e in employees)
                  DropdownMenuItem(
                      value: e['id'] as String, child: Text(employeeLabel(e)))
              ],
              onChanged: (v) => empId = v,
              decoration: const InputDecoration(labelText: 'Employee'),
            ),
            TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Goal title')),
            TextField(
                controller: target,
                decoration: const InputDecoration(labelText: 'Target')),
            OutlinedButton(
              onPressed: () async {
                final d = await showDatePicker(
                    context: ctx,
                    initialDate: due,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 730)));
                if (d != null) setD(() => due = d);
              },
              child: Text('Due: ${due.toIso8601String().substring(0, 10)}'),
            ),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/goals', {
                    'employeeId': empId,
                    'title': title.text,
                    'target': target.text,
                    'dueDate': due.toUtc().toIso8601String(),
                  });
                  if (mounted) showOk(context, 'Goal assigned');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _goalTile(dynamic g, {bool showBump = true}) => Card(
        child: ListTile(
          title: Text(str(g['title'] ?? g['kpi']?['name'])),
          subtitle:
              Text('${g['progress'] ?? 0}% · ${employeeLabel(g['employee'])}'),
          trailing: showBump
              ? FilledButton(
                  onPressed: () => _bump(g), child: const Text('+10%'))
              : StatusBadge(str(g['status'])),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Goals'),
        bottom: canAssignGoals
            ? TabBar(
                controller: _tc,
                tabs: const [Tab(text: 'My goals'), Tab(text: 'Team')])
            : null,
        actions: [
          if (isHrOrAdmin)
            IconButton(
                icon: const Icon(Icons.add),
                onPressed: _addKpi,
                tooltip: 'Add KPI'),
          if (canAssignGoals)
            IconButton(icon: const Icon(Icons.person_add), onPressed: _assign),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: canAssignGoals
            ? TabBarView(
                controller: _tc,
                children: [
                  mine.isEmpty
                      ? ListView(children: const [
                          EmptyState('No goals assigned.',
                              icon: Icons.track_changes)
                        ])
                      : ListView(
                          children: [for (final g in mine) _goalTile(g)]),
                  teamGoals.isEmpty
                      ? ListView(children: const [EmptyState('No team goals.')])
                      : ListView(children: [
                          for (final g in teamGoals)
                            _goalTile(g, showBump: false)
                        ]),
                ],
              )
            : mine.isEmpty
                ? ListView(children: const [
                    EmptyState('No goals assigned.', icon: Icons.track_changes)
                  ])
                : ListView(children: [for (final g in mine) _goalTile(g)]),
      ),
    );
  }
}

// ── Appraisals ───────────────────────────────────────────────────────────────

class AppraisalsScreen extends StatefulWidget {
  const AppraisalsScreen({super.key});
  @override
  State<AppraisalsScreen> createState() => _AppraisalsScreenState();
}

class _AppraisalsScreenState extends State<AppraisalsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;
  List mine = [], team = [], cycles = [];
  bool busy = false;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: isHrOrAdmin ? 3 : 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try {
      mine = asList(await ApiClient.get('/appraisals/mine'));
    } catch (_) {}
    try {
      team = asList(await ApiClient.get('/appraisals/team'));
    } catch (_) {}
    if (isHrOrAdmin) {
      try {
        cycles = asList(await ApiClient.get('/appraisals/cycles'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  List<String> _sections(dynamic cycle) {
    final t = cycle?['template'];
    if (t is List) return t.map((e) => e.toString()).toList();
    if (t is Map && t['sections'] is List) {
      return (t['sections'] as List).map((e) => e.toString()).toList();
    }
    return ['Delivery', 'Collaboration', 'Growth'];
  }

  Future<void> _submitSelf(Map a) async {
    final self = a['_self'] as Map<String, dynamic>? ?? {};
    final sections = _sections(a['cycle']);
    for (final s in sections) {
      if ((self[s] ?? '').toString().isEmpty) {
        if (mounted) showError(context, 'Fill all sections: $s');
        return;
      }
    }
    setState(() => busy = true);
    try {
      await ApiClient.post(
          '/appraisals/${a['id']}/self-review', {'selfReview': self});
      if (mounted) showOk(context, 'Self-review submitted');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _submitManager(Map a) async {
    final mgr = a['_mgr'] as Map<String, dynamic>? ?? {};
    final rating = a['_rating'] ?? '3';
    setState(() => busy = true);
    try {
      await ApiClient.post('/appraisals/${a['id']}/manager-review', {
        'managerReview': mgr,
        'rating': int.tryParse(rating.toString()) ?? 3,
      });
      if (mounted) showOk(context, 'Manager review submitted');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _createCycle() async {
    final name = TextEditingController();
    String frequency = 'QUARTERLY';
    DateTime start = DateTime.now();
    DateTime end = DateTime.now().add(const Duration(days: 90));
    final sections = <String>['Delivery quality', 'Collaboration'];
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create review cycle'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name')),
              DropdownButtonFormField(
                value: frequency,
                items: const [
                  DropdownMenuItem(
                      value: 'QUARTERLY', child: Text('Quarterly')),
                  DropdownMenuItem(
                      value: 'HALF_YEARLY', child: Text('Half yearly')),
                  DropdownMenuItem(value: 'YEARLY', child: Text('Yearly')),
                ],
                onChanged: (v) => setD(() => frequency = v as String),
                decoration: const InputDecoration(labelText: 'Frequency'),
              ),
              for (var i = 0; i < sections.length; i++)
                TextField(
                  decoration: InputDecoration(labelText: 'Section ${i + 1}'),
                  controller: TextEditingController(text: sections[i]),
                  onChanged: (v) => sections[i] = v,
                ),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/appraisals/cycles', {
                    'name': name.text,
                    'frequency': frequency,
                    'startDate': start.toUtc().toIso8601String(),
                    'endDate': end.toUtc().toIso8601String(),
                    'template': sections.where((s) => s.isNotEmpty).toList(),
                  });
                  if (mounted) showOk(context, 'Cycle created');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launch(String id) async {
    try {
      await ApiClient.post('/appraisals/cycles/$id/launch');
      if (mounted) showOk(context, 'Cycle launched');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Widget _mineCard(Map a) {
    a['_self'] ??= <String, dynamic>{};
    final sections = _sections(a['cycle']);
    return SectionCard(
      title: str(a['cycle']?['name']),
      trailing: StatusBadge(str(a['status'])),
      child: a['status'] == 'SELF_REVIEW'
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final s in sections)
                  TextField(
                    decoration: InputDecoration(labelText: s),
                    onChanged: (v) => (a['_self'] as Map)[s] = v,
                  ),
                const SizedBox(height: 8),
                FilledButton(
                    onPressed: busy ? null : () => _submitSelf(a),
                    child: const Text('Submit self-review')),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (a['selfReview'] != null)
                  const Text('Self-review submitted'),
                if (a['finalRating'] != null)
                  Text('Rating: ${a['finalRating']} / 5'),
              ],
            ),
    );
  }

  Widget _teamCard(Map a) {
    a['_mgr'] ??= <String, dynamic>{};
    a['_rating'] ??= '3';
    final sections = _sections(a['cycle']);
    return SectionCard(
      title: employeeLabel(a['employee']),
      trailing: StatusBadge(str(a['status'])),
      child: a['status'] == 'MANAGER_REVIEW'
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final s in sections)
                  TextField(
                    decoration: InputDecoration(labelText: s),
                    onChanged: (v) => (a['_mgr'] as Map)[s] = v,
                  ),
                DropdownButtonFormField(
                  value: a['_rating'].toString(),
                  items: [
                    for (var i = 1; i <= 5; i++)
                      DropdownMenuItem(value: '$i', child: Text('$i')),
                  ],
                  onChanged: (v) => a['_rating'] = v,
                  decoration: const InputDecoration(labelText: 'Rating'),
                ),
                FilledButton(
                    onPressed: busy ? null : () => _submitManager(a),
                    child: const Text('Submit manager review')),
              ],
            )
          : Text('Rating: ${str(a['finalRating'], 'pending')}'),
    );
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      const Tab(text: 'Mine'),
      const Tab(text: 'Team'),
      if (isHrOrAdmin) const Tab(text: 'Cycles'),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('Appraisals'),
        bottom: TabBar(controller: _tc, tabs: tabs),
        actions: [
          if (isHrOrAdmin)
            IconButton(icon: const Icon(Icons.add), onPressed: _createCycle)
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: TabBarView(
          controller: _tc,
          children: [
            mine.isEmpty
                ? ListView(children: const [
                    EmptyState('No appraisals.', icon: Icons.star_outline)
                  ])
                : ListView(children: [for (final a in mine) _mineCard(a)]),
            team.isEmpty
                ? ListView(children: const [EmptyState('No team appraisals.')])
                : ListView(children: [for (final a in team) _teamCard(a)]),
            if (isHrOrAdmin)
              cycles.isEmpty
                  ? ListView(children: const [EmptyState('No cycles.')])
                  : ListView(
                      children: [
                        for (final c in cycles)
                          Card(
                            child: ListTile(
                              title: Text(str(c['name'])),
                              subtitle: Text(
                                  '${str(c['frequency'])} · ${c['_count']?['appraisals'] ?? 0} appraisals'),
                              trailing: TextButton(
                                  onPressed: () => _launch(c['id'].toString()),
                                  child: const Text('Launch')),
                            ),
                          ),
                      ],
                    ),
          ],
        ),
      ),
    );
  }
}

// ── Payroll ──────────────────────────────────────────────────────────────────

class PayrollScreen extends StatefulWidget {
  const PayrollScreen({super.key});
  @override
  State<PayrollScreen> createState() => _PayrollScreenState();
}

class _PayrollScreenState extends State<PayrollScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;
  List calendars = [], runs = [], mySlips = [], runSlips = [];
  List employees = [], adjustments = [], declarations = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: isHrOrAdmin ? 4 : 3, vsync: this);
    _load();
  }

  Future<void> _load() async {
    if (isHrOrAdmin) {
      try {
        calendars = asList(await ApiClient.get('/payroll/calendars'));
      } catch (_) {}
      try {
        runs = asList(await ApiClient.get('/payroll/runs'));
      } catch (_) {}
      try {
        employees = asList(await ApiClient.get('/employees'));
      } catch (_) {}
      try {
        adjustments = asList(await ApiClient.get('/payroll/adjustments'));
      } catch (_) {}
      try {
        declarations = asList(await ApiClient.get('/payroll/tax-declarations'));
      } catch (_) {}
    } else {
      try {
        mySlips = asList(await ApiClient.get('/payroll/payslips/mine'));
      } catch (_) {}
      try {
        adjustments = asList(await ApiClient.get('/payroll/adjustments/mine'));
      } catch (_) {}
      try {
        declarations =
            asList(await ApiClient.get('/payroll/tax-declarations/mine'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _createCal() async {
    final name = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create payroll calendar'),
        content: TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Name')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/payroll/calendars', {'name': name.text});
                if (mounted) showOk(context, 'Calendar created');
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

  Future<void> _createRun() async {
    String? calId =
        calendars.isNotEmpty ? calendars.first['id'] as String? : null;
    DateTime start = DateTime.now().subtract(const Duration(days: 30));
    DateTime end = DateTime.now();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create payroll run'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            if (calendars.isNotEmpty)
              DropdownButtonFormField(
                value: calId,
                items: [
                  for (final c in calendars)
                    DropdownMenuItem(
                        value: c['id'] as String, child: Text(str(c['name'])))
                ],
                onChanged: (v) => calId = v,
                decoration: const InputDecoration(labelText: 'Calendar'),
              ),
            OutlinedButton(
              onPressed: () async {
                final r = await showDateRangePicker(
                    context: ctx,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                    initialDateRange: DateTimeRange(start: start, end: end));
                if (r != null) {
                  setD(() {
                    start = r.start;
                    end = r.end;
                  });
                }
              },
              child: Text(
                  '${start.toIso8601String().substring(0, 10)} – ${end.toIso8601String().substring(0, 10)}'),
            ),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/payroll/runs', {
                    'calendarId': calId,
                    'periodStart': start.toUtc().toIso8601String(),
                    'periodEnd': end.toUtc().toIso8601String(),
                  });
                  if (mounted) showOk(context, 'Run created');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _process(String id) async {
    try {
      await ApiClient.post('/payroll/runs/$id/process', {});
      if (mounted) showOk(context, 'Payroll processed');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _createAdjustment() async {
    if (employees.isEmpty) return;
    String? employeeId = employees.first['id']?.toString();
    String type = 'BONUS';
    final amount = TextEditingController();
    final period = TextEditingController(
        text: DateTime.now().toIso8601String().substring(0, 7));
    final note = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Add payroll adjustment'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButtonFormField<String>(
                value: employeeId,
                items: [
                  for (final e in employees)
                    DropdownMenuItem(
                        value: e['id']?.toString(),
                        child: Text(employeeLabel(e)))
                ],
                onChanged: (value) => setD(() => employeeId = value),
                decoration: const InputDecoration(labelText: 'Employee'),
              ),
              DropdownButtonFormField<String>(
                value: type,
                items: [
                  'BONUS',
                  'INCENTIVE',
                  'OVERTIME',
                  'ARREAR',
                  'RECOVERY',
                  'LOAN',
                  'ADVANCE'
                ]
                    .map((value) =>
                        DropdownMenuItem(value: value, child: Text(value)))
                    .toList(),
                onChanged: (value) => setD(() => type = value ?? 'BONUS'),
                decoration: const InputDecoration(labelText: 'Type'),
              ),
              TextField(
                  controller: amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Amount')),
              TextField(
                  controller: period,
                  decoration: const InputDecoration(
                      labelText: 'Payroll month (YYYY-MM)')),
              TextField(
                  controller: note,
                  decoration: const InputDecoration(labelText: 'Note')),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/payroll/adjustments', {
                    'employeeId': employeeId,
                    'type': type,
                    'amount': double.tryParse(amount.text) ?? 0,
                    'period': period.text,
                    'note': note.text,
                  });
                  if (mounted) showOk(context, 'Payroll adjustment added');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitTaxDeclaration() async {
    final year = DateTime.now().year;
    final fiscalYear = TextEditingController(
        text: '$year-${(year + 1).toString().substring(2)}');
    final section = TextEditingController(text: '80C');
    final description = TextEditingController();
    final amount = TextEditingController();
    String regime = 'NEW';
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Submit tax declaration'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                  controller: fiscalYear,
                  decoration: const InputDecoration(labelText: 'Fiscal year')),
              DropdownButtonFormField<String>(
                value: regime,
                items: const [
                  DropdownMenuItem(value: 'NEW', child: Text('NEW')),
                  DropdownMenuItem(value: 'OLD', child: Text('OLD'))
                ],
                onChanged: (value) => setD(() => regime = value ?? 'NEW'),
                decoration: const InputDecoration(labelText: 'Tax regime'),
              ),
              TextField(
                  controller: section,
                  decoration: const InputDecoration(labelText: 'Section')),
              TextField(
                  controller: description,
                  decoration: const InputDecoration(labelText: 'Description')),
              TextField(
                  controller: amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Amount')),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/payroll/tax-declarations', {
                    'fiscalYear': fiscalYear.text,
                    'regime': regime,
                    'items': [
                      {
                        'section': section.text,
                        'description': description.text,
                        'amount': double.tryParse(amount.text) ?? 0
                      }
                    ],
                  });
                  if (mounted) showOk(context, 'Tax declaration submitted');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _verifyTax(String id) async {
    try {
      await ApiClient.post('/payroll/tax-declarations/$id/verify');
      if (mounted) showOk(context, 'Tax declaration verified');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _viewSlips(String runId) async {
    try {
      runSlips = asList(await ApiClient.get('/payroll/runs/$runId/payslips'));
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          builder: (_, sc) => ListView(
            controller: sc,
            children: [
              const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Payslips',
                      style: TextStyle(fontWeight: FontWeight.w700))),
              for (final p in runSlips)
                ListTile(
                  title: Text(employeeLabel(p['employee'])),
                  subtitle: Text('Gross: ₹ ${p['grossPay']}'),
                  trailing: Text('Net: ₹ ${p['netPay']}'),
                ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _payslipDetail(dynamic slip) async {
    await showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  str(slip['period']?['label'] ??
                      slip['payrollRun']?['periodStart'] ??
                      'Payslip'),
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700)),
              Text('Gross: ₹ ${slip['grossPay'] ?? slip['gross'] ?? '—'}'),
              Text('Net: ₹ ${slip['netPay'] ?? slip['net'] ?? '—'}'),
              if (slip['components'] is List)
                for (final c in slip['components'] as List)
                  Text('${c['name']}: ₹ ${c['amount'] ?? c['monthly']}'),
            ]),
      ),
    );
  }

  String _payrollEmployee(dynamic item) {
    if (item['employee'] != null) return employeeLabel(item['employee']);
    final id = item['employeeId']?.toString();
    for (final employee in employees) {
      if (employee['id']?.toString() == id) return employeeLabel(employee);
    }
    return id ?? 'Employee';
  }

  Widget _adjustmentsView() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (isHrOrAdmin)
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: employees.isEmpty ? null : _createAdjustment,
                icon: const Icon(Icons.add),
                label: const Text('Add adjustment'),
              ),
            ),
          if (adjustments.isEmpty)
            const EmptyState('No payroll adjustments.')
          else
            for (final adjustment in adjustments)
              Card(
                child: ListTile(
                  title: Text(
                      '${str(adjustment['type'])} - ${adjustment['period']}'),
                  subtitle: Text(isHrOrAdmin
                      ? _payrollEmployee(adjustment)
                      : str(adjustment['note'])),
                  trailing: Text('${adjustment['amount']}'),
                ),
              ),
        ],
      );

  Widget _taxView() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (!isHrOrAdmin)
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: _submitTaxDeclaration,
                icon: const Icon(Icons.add),
                label: const Text('Submit declaration'),
              ),
            ),
          if (declarations.isEmpty)
            const EmptyState('No tax declarations.')
          else
            for (final declaration in declarations)
              Card(
                child: ListTile(
                  title: Text(
                      '${declaration['fiscalYear']} - ${str(declaration['regime'])}'),
                  subtitle: Text(
                      '${isHrOrAdmin ? '${_payrollEmployee(declaration)} - ' : ''}Total ${declaration['total'] ?? 0}'),
                  trailing: isHrOrAdmin && declaration['status'] != 'VERIFIED'
                      ? TextButton(
                          onPressed: () =>
                              _verifyTax(declaration['id'].toString()),
                          child: const Text('Verify'))
                      : StatusBadge(str(declaration['status'])),
                ),
              ),
        ],
      );

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payroll'),
        bottom: TabBar(
          controller: _tc,
          isScrollable: true,
          tabs: isHrOrAdmin
              ? const [
                  Tab(text: 'Runs'),
                  Tab(text: 'Calendars'),
                  Tab(text: 'Adjustments'),
                  Tab(text: 'Tax')
                ]
              : const [
                  Tab(text: 'Payslips'),
                  Tab(text: 'Adjustments'),
                  Tab(text: 'Tax')
                ],
        ),
        actions: [
          if (isHrOrAdmin)
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'cal') _createCal();
                if (v == 'run') _createRun();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'cal', child: Text('New calendar')),
                PopupMenuItem(value: 'run', child: Text('New run')),
              ],
              icon: const Icon(Icons.add),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: isHrOrAdmin
            ? TabBarView(
                controller: _tc,
                children: [
                  runs.isEmpty
                      ? ListView(
                          children: const [EmptyState('No payroll runs.')])
                      : ListView.builder(
                          itemCount: runs.length,
                          itemBuilder: (_, i) {
                            final r = runs[i];
                            return Card(
                              child: ListTile(
                                title: Text(
                                    '${r['periodStart']?.toString().substring(0, 10)} – ${r['periodEnd']?.toString().substring(0, 10)}'),
                                subtitle: Text(str(r['calendar']?['name'])),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    StatusBadge(str(r['status'])),
                                    if (r['status'] == 'DRAFT')
                                      IconButton(
                                          icon: const Icon(Icons.play_arrow),
                                          onPressed: () =>
                                              _process(r['id'].toString())),
                                    if (r['status'] == 'COMPLETED')
                                      IconButton(
                                          icon: const Icon(Icons.receipt),
                                          onPressed: () =>
                                              _viewSlips(r['id'].toString())),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                  calendars.isEmpty
                      ? ListView(children: const [EmptyState('No calendars.')])
                      : ListView.builder(
                          itemCount: calendars.length,
                          itemBuilder: (_, i) => Card(
                            child: ListTile(
                                title: Text(str(calendars[i]['name'])),
                                subtitle: Text(
                                    'Pay day ${calendars[i]['payDay'] ?? '—'}')),
                          ),
                        ),
                  _adjustmentsView(),
                  _taxView(),
                ],
              )
            : TabBarView(
                controller: _tc,
                children: [
                  mySlips.isEmpty
                      ? ListView(children: const [EmptyState('No payslips.')])
                      : ListView.builder(
                          itemCount: mySlips.length,
                          itemBuilder: (_, i) {
                            final p = mySlips[i];
                            return Card(
                              child: ListTile(
                                title: Text(str(p['period']?['label'] ??
                                    p['payrollRun']?['periodStart'] ??
                                    'Payslip')),
                                subtitle: Text(
                                    'Net: ${p['netPay'] ?? p['net'] ?? '-'}'),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () => _payslipDetail(p),
                              ),
                            );
                          },
                        ),
                  _adjustmentsView(),
                  _taxView(),
                ],
              ),
      ),
    );
  }
}

// ── Benefits ─────────────────────────────────────────────────────────────────

class BenefitsScreen extends StatefulWidget {
  const BenefitsScreen({super.key});
  @override
  State<BenefitsScreen> createState() => _BenefitsScreenState();
}

class _BenefitsScreenState extends State<BenefitsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;
  List plans = [], mine = [], enrollments = [], employees = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: isHrOrAdmin ? 3 : 1, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try {
      plans = asList(await ApiClient.get('/benefits/plans'));
    } catch (_) {}
    try {
      mine = asList(await ApiClient.get('/benefits/enrollments/mine'));
    } catch (_) {}
    if (isHrOrAdmin) {
      try {
        employees = asList(await ApiClient.get('/employees'));
      } catch (_) {}
      try {
        enrollments = asList(await ApiClient.get('/benefits/enrollments'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _createPlan() async {
    final code = TextEditingController();
    final name = TextEditingController();
    final category = TextEditingController(text: 'HEALTH');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add benefit plan'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
              controller: code,
              decoration: const InputDecoration(labelText: 'Code')),
          TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name')),
          TextField(
              controller: category,
              decoration: const InputDecoration(labelText: 'Category')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/benefits/plans', {
                  'code': code.text,
                  'name': name.text,
                  'category': category.text
                });
                if (mounted) showOk(context, 'Plan created');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Future<void> _enroll(dynamic plan) async {
    if (employees.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Enroll in ${plan['name']}'),
        content: DropdownButtonFormField(
          value: empId,
          items: [
            for (final e in employees)
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
                await ApiClient.post('/benefits/plans/${plan['id']}/enroll',
                    {'employeeId': empId});
                if (mounted) showOk(context, 'Enrolled');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Enroll'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Benefits'),
        bottom: isHrOrAdmin
            ? TabBar(controller: _tc, tabs: const [
                Tab(text: 'My enrollments'),
                Tab(text: 'Plans'),
                Tab(text: 'All enrollments')
              ])
            : null,
        actions: [
          if (isHrOrAdmin)
            IconButton(icon: const Icon(Icons.add), onPressed: _createPlan)
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: isHrOrAdmin
            ? TabBarView(
                controller: _tc,
                children: [
                  _enrollmentList(mine),
                  ListView(
                    children: [
                      for (final p in plans)
                        Card(
                          child: ListTile(
                            title: Text(str(p['name'])),
                            subtitle: Text(str(p['category'])),
                            trailing: TextButton(
                                onPressed: () => _enroll(p),
                                child: const Text('Enroll')),
                          ),
                        ),
                    ],
                  ),
                  _enrollmentList(enrollments, showEmployee: true),
                ],
              )
            : _enrollmentList(mine),
      ),
    );
  }

  Widget _enrollmentList(List data, {bool showEmployee = false}) => data.isEmpty
      ? ListView(children: const [EmptyState('No enrollments.')])
      : ListView.builder(
          itemCount: data.length,
          itemBuilder: (_, i) {
            final e = data[i];
            return Card(
              child: ListTile(
                title: Text(showEmployee
                    ? employeeLabel(e['employee'])
                    : str(e['plan']?['name'])),
                subtitle: Text(showEmployee
                    ? str(e['plan']?['name'])
                    : str(e['plan']?['category'])),
                trailing: StatusBadge(str(e['status'])),
              ),
            );
          },
        );
}

// ── Exit ─────────────────────────────────────────────────────────────────────

class ExitScreen extends StatefulWidget {
  const ExitScreen({super.key});
  @override
  State<ExitScreen> createState() => _ExitScreenState();
}

class _ExitScreenState extends State<ExitScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Exit management'),
        bottom: TabBar(
            controller: _tc,
            tabs: const [Tab(text: 'My resignation'), Tab(text: 'All')]),
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          _MineExitTab(),
          ApiTabList(
            endpoint: '/exit/resignations',
            titleOf: (i) => employeeLabel(i['employee']),
            subtitleOf: (i) => str(i['reason']),
            statusOf: (i) => str(i['status']),
          ),
        ],
      ),
    );
  }
}

class _MineExitTab extends StatefulWidget {
  @override
  State<_MineExitTab> createState() => _MineExitTabState();
}

class _MineExitTabState extends State<_MineExitTab> {
  Map<String, dynamic>? resignation;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      resignation = await ApiClient.get('/exit/resignations/mine')
          as Map<String, dynamic>?;
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _submit() async {
    final reason = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Submit resignation'),
        content: TextField(
            controller: reason,
            decoration: const InputDecoration(labelText: 'Reason')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post(
                    '/exit/resignations', {'reason': reason.text});
                if (mounted) showOk(context, 'Resignation submitted');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const LoadingOverlay();
    if (resignation == null || resignation!['status'] == null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const EmptyState('No active resignation.'),
          FilledButton(
              onPressed: _submit, child: const Text('Submit resignation')),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(children: [
        Card(
          child: ListTile(
            title: const Text('My resignation'),
            subtitle: Text(str(resignation!['reason'])),
            trailing: StatusBadge(str(resignation!['status'])),
          ),
        ),
      ]),
    );
  }
}

// ── Employees ────────────────────────────────────────────────────────────────

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});
  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;
  List directory = [], team = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try {
      directory = asList(await ApiClient.get('/employees'));
    } catch (_) {}
    try {
      team = asList(await ApiClient.get('/employees/team'));
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _create() async {
    final first = TextEditingController();
    final last = TextEditingController();
    final email = TextEditingController();
    final code = TextEditingController();
    final designation = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create employee'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: first,
                decoration: const InputDecoration(labelText: 'First name')),
            TextField(
                controller: last,
                decoration: const InputDecoration(labelText: 'Last name')),
            TextField(
                controller: email,
                decoration: const InputDecoration(labelText: 'Email')),
            TextField(
                controller: code,
                decoration: const InputDecoration(labelText: 'Employee code')),
            TextField(
                controller: designation,
                decoration: const InputDecoration(labelText: 'Designation')),
          ]),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/employees', {
                  'firstName': first.text,
                  'lastName': last.text,
                  'email': email.text,
                  'employeeCode': code.text,
                  'designation': designation.text,
                });
                if (mounted) showOk(context, 'Employee created');
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

  Future<void> _setStatus(dynamic employee, String status) async {
    try {
      await ApiClient.patch('/employees/${employee['id']}', {'status': status});
      if (mounted) showOk(context, 'Employment status updated');
      await _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Widget _empList(List data) => RefreshIndicator(
        onRefresh: _load,
        child: data.isEmpty
            ? ListView(children: const [EmptyState('No employees.')])
            : ListView.builder(
                itemCount: data.length,
                itemBuilder: (_, i) {
                  final e = data[i];
                  return Card(
                    child: ListTile(
                      title: Text(employeeLabel(e)),
                      subtitle: Text(
                          '${str(e['designation'])} · ${str(e['department']?['name'])}'),
                      trailing: StatusBadge(str(e['status'])),
                      onTap: () => showModalBottomSheet(
                        context: context,
                        builder: (ctx) => SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(employeeLabel(e),
                                    style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700)),
                                Text(str(e['user']?['email'])),
                                Text(
                                    'Manager: ${personName(e['manager']?['user'])}'),
                                Text('Joined: ${str(e['joinDate'])}'),
                                const SizedBox(height: 12),
                                if (canManageHr && e['status'] == 'ONBOARDING')
                                  FilledButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _setStatus(e, 'ACTIVE');
                                    },
                                    child: const Text('Activate employee'),
                                  ),
                                if (canManageHr && e['status'] == 'ACTIVE')
                                  OutlinedButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _setStatus(e, 'ON_NOTICE');
                                    },
                                    child: const Text('Mark on notice'),
                                  ),
                                if (canManageHr && e['status'] == 'ON_NOTICE')
                                  FilledButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _setStatus(e, 'ACTIVE');
                                    },
                                    child: const Text('Reactivate employee'),
                                  ),
                                if (canManageHr && e['status'] != 'EXITED')
                                  const Text(
                                      'Use Exit management for final release and EXITED status.'),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
      );

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employees'),
        bottom: TabBar(
            controller: _tc,
            tabs: const [Tab(text: 'Directory'), Tab(text: 'My team')]),
        actions: [
          if (canManageHr)
            IconButton(icon: const Icon(Icons.add), onPressed: _create)
        ],
      ),
      body: TabBarView(
          controller: _tc, children: [_empList(directory), _empList(team)]),
    );
  }
}

// ── Reports ────────────────────────────────────────────────────────────────────

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List catalogue = [];
  dynamic reportResult;
  String? selectedCode;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      catalogue = asList(await ApiClient.get('/reports'));
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _run(String code) async {
    setState(() {
      selectedCode = code;
      reportResult = null;
    });
    try {
      final r = await ApiClient.get('/reports/$code');
      if (mounted) setState(() => reportResult = r);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final r in catalogue)
                    Card(
                      child: ListTile(
                        title: Text('${r['code']} — ${r['name']}'),
                        subtitle: Text(str(r['description'])),
                        trailing: const Icon(Icons.play_arrow),
                        onTap: () => _run(str(r['code'])),
                      ),
                    ),
                  if (reportResult != null) ...[
                    const SizedBox(height: 16),
                    SectionCard(
                      title: 'Result: $selectedCode',
                      child: ReportView(reportResult),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}

// ── Catalogues ───────────────────────────────────────────────────────────────

class CataloguesScreen extends StatelessWidget {
  const CataloguesScreen({super.key});
  @override
  Widget build(BuildContext context) => TabbedApiScreen(
        title: 'Catalogues',
        tabs: [
          (
            label: 'Data entities',
            endpoint: '/v1/data-entities',
            titleOf: (i) => str(i['name'] ?? i['code']),
            subtitleOf: (i) => str(i['module']),
            statusOf: (_) => ''
          ),
          (
            label: 'API catalogue',
            endpoint: '/v1/api-catalogue',
            titleOf: (i) => '${str(i['method'] ?? '')} ${str(i['path'])}',
            subtitleOf: (i) => str(i['summary']),
            statusOf: (_) => ''
          ),
        ],
      );
}

// ── Requirements ─────────────────────────────────────────────────────────────

class RequirementsScreen extends StatelessWidget {
  const RequirementsScreen({super.key});
  @override
  Widget build(BuildContext context) => TabbedApiScreen(
        title: 'Requirements',
        tabs: [
          (
            label: 'Modules',
            endpoint: '/requirements/modules',
            titleOf: (i) => str(i['name'] ?? i['code']),
            subtitleOf: (i) => str(i['description']),
            statusOf: (_) => ''
          ),
          (
            label: 'Features',
            endpoint: '/requirements/features',
            titleOf: (i) => str(i['title'] ?? i['code']),
            subtitleOf: (i) => str(i['module']),
            statusOf: (i) => str(i['status'], '')
          ),
          (
            label: 'Roles',
            endpoint: '/requirements/roles',
            titleOf: (i) => str(i['name'] ?? i['code']),
            subtitleOf: (i) => str(i['description']),
            statusOf: (_) => ''
          ),
        ],
      );
}

// ── Audit ────────────────────────────────────────────────────────────────────

class AuditScreen extends StatelessWidget {
  const AuditScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiListScreen(
        title: 'Audit trail',
        endpoint: '/audit',
        titleOf: (i) => '${i['action']} · ${i['entityType']}',
        subtitleOf: (i) => '${personName(i['actor'])} · ${i['createdAt']}',
        statusOf: (_) => '',
      );
}

// ── Execution ────────────────────────────────────────────────────────────────

class ExecutionScreen extends StatefulWidget {
  const ExecutionScreen({super.key});
  @override
  State<ExecutionScreen> createState() => _ExecutionScreenState();
}

class _ExecutionScreenState extends State<ExecutionScreen> {
  List checklist = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/v1/execution/checklist');
      if (data is Map && data['steps'] is List) {
        checklist = data['steps'] as List;
      } else {
        checklist = asList(data);
      }
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Execution')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: checklist.isEmpty
                  ? ListView(
                      children: const [EmptyState('No checklist items.')])
                  : ListView.builder(
                      itemCount: checklist.length,
                      itemBuilder: (_, i) {
                        final c = checklist[i];
                        return Card(
                          child: ListTile(
                            title:
                                Text(str(c['step'] ?? c['title'] ?? c['name'])),
                            subtitle: Text(
                                '${str(c['sheetRef'] ?? c['description'])} · ${str(c['evidence'])}'),
                            trailing: StatusBadge(str(c['status'] ??
                                (c['done'] == true ? 'DONE' : 'PENDING'))),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── Privacy ──────────────────────────────────────────────────────────────────

class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});
  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  List consents = [], dsrs = [], allDsrs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      consents = asList(await ApiClient.get('/privacy/consent/mine'));
    } catch (_) {}
    try {
      dsrs = asList(await ApiClient.get('/privacy/dsr/mine'));
    } catch (_) {}
    if (isHrOrAdmin) {
      try {
        allDsrs = asList(await ApiClient.get('/privacy/dsr'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _recordConsent() async {
    final purpose = TextEditingController();
    var granted = true;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Record consent'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: purpose,
                decoration: const InputDecoration(labelText: 'Purpose')),
            SwitchListTile(
                title: const Text('Granted'),
                value: granted,
                onChanged: (v) => setD(() => granted = v)),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/privacy/consent',
                      {'purpose': purpose.text, 'granted': granted});
                  if (mounted) showOk(context, 'Consent recorded');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Record'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitDsr() async {
    String type = 'ACCESS';
    final details = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Submit DSR'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField(
              value: type,
              items: const [
                DropdownMenuItem(value: 'ACCESS', child: Text('Access')),
                DropdownMenuItem(value: 'ERASURE', child: Text('Erasure')),
                DropdownMenuItem(
                    value: 'PORTABILITY', child: Text('Portability')),
                DropdownMenuItem(
                    value: 'RECTIFICATION', child: Text('Rectification')),
              ],
              onChanged: (v) => setD(() => type = v as String),
              decoration: const InputDecoration(labelText: 'Type'),
            ),
            TextField(
                controller: details,
                decoration:
                    const InputDecoration(labelText: 'Details (optional)')),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/privacy/dsr', {
                    'type': type,
                    if (details.text.isNotEmpty) 'details': details.text
                  });
                  if (mounted) showOk(context, 'DSR submitted');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _completeDsr(String id) async {
    try {
      await ApiClient.patch('/privacy/dsr/$id', {'status': 'COMPLETED'});
      if (mounted) showOk(context, 'DSR completed');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy & consent'),
        actions: [
          IconButton(
              icon: const Icon(Icons.add_moderator),
              onPressed: _recordConsent,
              tooltip: 'Record consent'),
          IconButton(
              icon: const Icon(Icons.privacy_tip_outlined),
              onPressed: _submitDsr,
              tooltip: 'Submit DSR'),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            SectionCard(
              title: 'My consents',
              child: consents.isEmpty
                  ? const EmptyState('No consents recorded.')
                  : Column(children: [
                      for (final c in consents)
                        RowTile(
                            title: str(c['purpose'] ?? c['type']),
                            subtitle: str(c['grantedAt']),
                            trailing: StatusBadge(
                                c['granted'] == true ? 'APPROVED' : 'PENDING')),
                    ]),
            ),
            SectionCard(
              title: 'My DSR requests',
              child: dsrs.isEmpty
                  ? const EmptyState('No DSR requests.')
                  : Column(children: [
                      for (final d in dsrs)
                        RowTile(
                            title: str(d['type']),
                            subtitle: str(d['details']),
                            trailing: StatusBadge(str(d['status']))),
                    ]),
            ),
            if (isHrOrAdmin)
              SectionCard(
                title: 'All tenant DSRs',
                child: allDsrs.isEmpty
                    ? const EmptyState('No DSRs.')
                    : Column(children: [
                        for (final d in allDsrs)
                          RowTile(
                            title: str(d['type']),
                            subtitle: str(d['userId']),
                            trailing: d['status'] != 'COMPLETED'
                                ? TextButton(
                                    onPressed: () =>
                                        _completeDsr(d['id'].toString()),
                                    child: const Text('Complete'))
                                : const StatusBadge('COMPLETED'),
                          ),
                      ]),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Compliance ───────────────────────────────────────────────────────────────

class ComplianceScreen extends StatefulWidget {
  const ComplianceScreen({super.key});
  @override
  State<ComplianceScreen> createState() => _ComplianceScreenState();
}

class _ComplianceScreenState extends State<ComplianceScreen> {
  List mine = [], cases = [], purge = [];
  final f = <String, dynamic>{'type': 'INCIDENT', 'anonymous': false};
  final rf = <String, dynamic>{'entity': 'CANDIDATE', 'retainMonths': 24};
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      mine = asList(await ApiClient.get('/compliance/cases/mine'));
    } catch (_) {}
    if (isHrOrAdmin) {
      try {
        cases = asList(await ApiClient.get('/compliance/cases'));
      } catch (_) {}
    }
    if (isTenantAdmin) {
      try {
        purge =
            asList(await ApiClient.get('/compliance/retention/purge-preview'));
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _report() async {
    final title = TextEditingController(text: f['title'] as String? ?? '');
    final details = TextEditingController(text: f['details'] as String? ?? '');
    String type = f['type'] as String? ?? 'INCIDENT';
    var anonymous = f['anonymous'] == true;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Raise a concern'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButtonFormField(
                value: type,
                items: const [
                  DropdownMenuItem(
                      value: 'POSH', child: Text('POSH complaint')),
                  DropdownMenuItem(
                      value: 'WHISTLEBLOWER', child: Text('Whistleblower')),
                  DropdownMenuItem(value: 'INCIDENT', child: Text('Incident')),
                  DropdownMenuItem(
                      value: 'GRIEVANCE', child: Text('Grievance')),
                  DropdownMenuItem(
                      value: 'CONFLICT_OF_INTEREST',
                      child: Text('Conflict of interest')),
                ],
                onChanged: (v) => setD(() => type = v as String),
                decoration: const InputDecoration(labelText: 'Type'),
              ),
              TextField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'Title')),
              TextField(
                  controller: details,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Details')),
              SwitchListTile(
                  title: const Text('Report anonymously'),
                  value: anonymous,
                  onChanged: (v) => setD(() => anonymous = v)),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/compliance/cases', {
                    'type': type,
                    'title': title.text,
                    'details': details.text,
                    'anonymous': anonymous,
                  });
                  if (mounted) showOk(context, 'Case submitted');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _update(String id, Map<String, dynamic> patch) async {
    try {
      await ApiClient.patch('/compliance/cases/$id', patch);
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _resolve(String id) async {
    final resolution = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Resolve case'),
        content: TextField(
            controller: resolution,
            decoration: const InputDecoration(labelText: 'Resolution note')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _update(id, {
                'status': 'RESOLVED',
                'resolution':
                    resolution.text.isEmpty ? 'Resolved' : resolution.text
              });
            },
            child: const Text('Resolve'),
          ),
        ],
      ),
    );
  }

  Future<void> _setRetention() async {
    try {
      await ApiClient.post('/compliance/retention', {
        'entity': rf['entity'],
        'retainMonths': int.tryParse('${rf['retainMonths']}') ?? 24,
      });
      if (mounted) showOk(context, 'Retention policy saved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Compliance'),
        actions: [
          IconButton(
              icon: const Icon(Icons.add),
              onPressed: _report,
              tooltip: 'Raise concern')
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            SectionCard(
              title: 'My cases',
              child: mine.isEmpty
                  ? const EmptyState('No cases.')
                  : Column(children: [
                      for (final c in mine)
                        RowTile(
                            title: '${str(c['type'])} — ${str(c['title'])}',
                            subtitle: str(c['details']),
                            trailing: StatusBadge(str(c['status']))),
                    ]),
            ),
            if (isHrOrAdmin)
              SectionCard(
                title: 'Case board (HR)',
                child: cases.isEmpty
                    ? const EmptyState('No cases.')
                    : Column(children: [
                        for (final c in cases)
                          Card(
                            child: ListTile(
                              title: Text(
                                  '${str(c['type'])} — ${str(c['title'])}'),
                              subtitle: Text(c['anonymous'] == true
                                  ? 'Anonymous'
                                  : str(c['reporterId'])),
                              trailing: StatusBadge(str(c['status'])),
                              onTap: () => showModalBottomSheet(
                                context: context,
                                builder: (ctx) => Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        if (c['status'] == 'OPEN')
                                          FilledButton(
                                              onPressed: () {
                                                Navigator.pop(ctx);
                                                _update(c['id'].toString(), {
                                                  'status':
                                                      'UNDER_INVESTIGATION'
                                                });
                                              },
                                              child: const Text('Investigate')),
                                        if (c['status'] != 'RESOLVED' &&
                                            c['status'] != 'DISMISSED') ...[
                                          FilledButton(
                                              onPressed: () {
                                                Navigator.pop(ctx);
                                                _resolve(c['id'].toString());
                                              },
                                              child: const Text('Resolve')),
                                          OutlinedButton(
                                              onPressed: () {
                                                Navigator.pop(ctx);
                                                _update(c['id'].toString(), {
                                                  'status': 'DISMISSED',
                                                  'resolution':
                                                      'Dismissed after review'
                                                });
                                              },
                                              child: const Text('Dismiss')),
                                        ],
                                        OutlinedButton(
                                            onPressed: () {
                                              Navigator.pop(ctx);
                                              _update(c['id'].toString(), {
                                                'legalHold':
                                                    c['legalHold'] != true
                                              });
                                            },
                                            child: Text(c['legalHold'] == true
                                                ? 'Release legal hold'
                                                : 'Apply legal hold')),
                                      ]),
                                ),
                              ),
                            ),
                          ),
                      ]),
              ),
            if (isTenantAdmin)
              SectionCard(
                title: 'Retention & purge preview',
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Expanded(
                            child: DropdownButtonFormField(
                          value: rf['entity'] as String,
                          items: const [
                            DropdownMenuItem(
                                value: 'CANDIDATE', child: Text('Candidate')),
                            DropdownMenuItem(
                                value: 'AUDIT_LOG', child: Text('Audit log')),
                            DropdownMenuItem(
                                value: 'ATTENDANCE', child: Text('Attendance')),
                            DropdownMenuItem(
                                value: 'COMPLIANCE_CASE',
                                child: Text('Compliance case')),
                          ],
                          onChanged: (v) => setState(() => rf['entity'] = v),
                          decoration:
                              const InputDecoration(labelText: 'Entity'),
                        )),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 80,
                          child: TextField(
                            controller: TextEditingController(
                                text: '${rf['retainMonths']}'),
                            keyboardType: TextInputType.number,
                            decoration:
                                const InputDecoration(labelText: 'Months'),
                            onChanged: (v) =>
                                rf['retainMonths'] = int.tryParse(v) ?? 24,
                          ),
                        ),
                      ]),
                      const SizedBox(height: 8),
                      Row(children: [
                        FilledButton(
                            onPressed: _setRetention,
                            child: const Text('Save policy')),
                        const SizedBox(width: 8),
                        OutlinedButton(
                            onPressed: _load,
                            child: const Text('Refresh preview')),
                      ]),
                      const SizedBox(height: 8),
                      for (final p in purge)
                        RowTile(
                            title: str(p['entity']),
                            subtitle:
                                '${p['retainMonths']} months · ${p['eligibleRows']} eligible',
                            trailing: StatusBadge(
                                p['purgeEnabled'] == true ? 'ON' : 'OFF')),
                      if (purge.isEmpty)
                        const EmptyState('No retention policies yet.'),
                    ]),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Interviews ───────────────────────────────────────────────────────────────

class InterviewsScreen extends StatefulWidget {
  const InterviewsScreen({super.key});
  @override
  State<InterviewsScreen> createState() => _InterviewsScreenState();
}

class _InterviewsScreenState extends State<InterviewsScreen> {
  List applications = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      applications = asList(await ApiClient.get('/applications'));
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _openInterviews(dynamic app) async {
    try {
      final interviews =
          asList(await ApiClient.get('/applications/${app['id']}/interviews'));
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          builder: (_, sc) => ListView(
            controller: sc,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                    'Interviews — ${app['candidate']?['firstName']} ${app['candidate']?['lastName']}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              for (final iv in interviews)
                ListTile(
                  title: Text(str(iv['round'] ?? iv['name'] ?? iv['type'])),
                  subtitle: Text(str(iv['scheduledAt'])),
                  trailing:
                      StatusBadge(str(iv['result'] ?? iv['status'], 'PENDING')),
                  onTap: () {
                    Navigator.pop(ctx);
                    _submitResult(iv, app);
                  },
                ),
              if (interviews.isEmpty)
                const EmptyState('No interviews scheduled.'),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _submitResult(dynamic iv, dynamic app) async {
    String result = 'PASSED';
    final rating = TextEditingController(text: '4');
    final notes = TextEditingController();
    String? screenshotFileId;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text('Submit result — ${str(iv['name'] ?? iv['round'])}'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              DropdownButtonFormField(
                value: result,
                items: const [
                  DropdownMenuItem(value: 'PASSED', child: Text('Passed')),
                  DropdownMenuItem(value: 'FAILED', child: Text('Failed')),
                  DropdownMenuItem(value: 'NO_SHOW', child: Text('No show')),
                ],
                onChanged: (v) => setD(() => result = v as String),
                decoration: const InputDecoration(labelText: 'Result'),
              ),
              TextField(
                  controller: rating,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Rating (1-5)')),
              TextField(
                  controller: notes,
                  decoration: const InputDecoration(labelText: 'Notes')),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                icon: const Icon(Icons.image),
                label: Text(screenshotFileId != null
                    ? 'Screenshot attached'
                    : 'Attach screenshot'),
                onPressed: () async {
                  final up = await pickAndUpload(
                      allowedExtensions: ['png', 'jpg', 'jpeg', 'webp']);
                  if (up != null) {
                    setD(() => screenshotFileId = up['id'] as String?);
                  }
                },
              ),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.patch('/interviews/${iv['id']}/result', {
                    'result': result,
                    'rating': int.tryParse(rating.text),
                    if (notes.text.isNotEmpty) 'notes': notes.text,
                    if (screenshotFileId != null)
                      'screenshotFileId': screenshotFileId,
                  });
                  if (mounted) showOk(context, 'Result submitted');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Interviews')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: applications.isEmpty
                  ? ListView(children: const [EmptyState('No applications.')])
                  : ListView.builder(
                      itemCount: applications.length,
                      itemBuilder: (_, i) {
                        final a = applications[i];
                        return Card(
                          child: ListTile(
                            title: Text(
                                '${a['candidate']?['firstName']} ${a['candidate']?['lastName']}'),
                            subtitle: Text(str(a['job']?['title'])),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _openInterviews(a),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── Matching ─────────────────────────────────────────────────────────────────

class MatchingScreen extends StatefulWidget {
  const MatchingScreen({super.key});
  @override
  State<MatchingScreen> createState() => _MatchingScreenState();
}

class _MatchingScreenState extends State<MatchingScreen> {
  List jobs = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      jobs = asList(await ApiClient.get('/jobs'));
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _showMatches(dynamic job) async {
    try {
      final matches = asList(await ApiClient.get('/jobs/${job['id']}/matches'));
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          builder: (_, sc) => ListView(
            controller: sc,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Matches for ${job['title']}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              for (final m in matches)
                ListTile(
                  title: Text(
                      '${m['candidate']?['firstName']} ${m['candidate']?['lastName']}'),
                  subtitle: Text('Score: ${m['score'] ?? m['matchScore']}'),
                  trailing: StatusBadge(str(m['status'], 'OPEN')),
                ),
              if (matches.isEmpty) const EmptyState('No matches found.'),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Matching')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: jobs.isEmpty
                  ? ListView(children: const [EmptyState('No jobs.')])
                  : ListView.builder(
                      itemCount: jobs.length,
                      itemBuilder: (_, i) {
                        final j = jobs[i];
                        return Card(
                          child: ListTile(
                            title: Text(str(j['title'])),
                            subtitle: Text(str(j['status'])),
                            trailing: const Icon(Icons.hub_outlined),
                            onTap: () => _showMatches(j),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── BGC Vendor ───────────────────────────────────────────────────────────────

class BgcVendorScreen extends StatefulWidget {
  const BgcVendorScreen({super.key});
  @override
  State<BgcVendorScreen> createState() => _BgcVendorScreenState();
}

class _BgcVendorScreenState extends State<BgcVendorScreen> {
  List cases = [];

  Future<void> _load() async {
    try {
      cases = asList(await ApiClient.get('/bgc/vendor/cases'));
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _detail(dynamic c) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        builder: (_, sc) => ListView(
          controller: sc,
          padding: const EdgeInsets.all(16),
          children: [
            Text(employeeLabel(c['employee']),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            Text('Package: ${str(c['package']?['name'])}'),
            Text('Status: ${str(c['status'])}'),
            if (c['reportSummary'] != null)
              Text('Report: ${c['reportSummary']}'),
            const SizedBox(height: 16),
            if (c['status'] != 'CLEAR' &&
                c['status'] != 'FAILED' &&
                c['status'] != 'DISCREPANCY')
              FilledButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _report(c);
                  },
                  child: const Text('Submit report')),
          ],
        ),
      ),
    );
  }

  Future<void> _report(dynamic c) async {
    final notes = TextEditingController();
    String status = 'CLEAR';
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Report — ${employeeLabel(c['employee'])}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField(
            value: status,
            items: const [
              DropdownMenuItem(value: 'CLEAR', child: Text('Clear')),
              DropdownMenuItem(
                  value: 'DISCREPANCY', child: Text('Discrepancy')),
              DropdownMenuItem(value: 'FAILED', child: Text('Failed')),
            ],
            onChanged: (v) => status = v as String,
            decoration: const InputDecoration(labelText: 'Status'),
          ),
          TextField(
              controller: notes,
              decoration: const InputDecoration(labelText: 'Report summary')),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/bgc/vendor/cases/${c['id']}/report', {
                  'status': status,
                  'reportSummary':
                      notes.text.isEmpty ? 'Report submitted' : notes.text,
                });
                if (mounted) showOk(context, 'Report submitted');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BGV cases')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: cases.isEmpty
            ? ListView(children: const [
                EmptyState('No cases assigned.', icon: Icons.biotech_outlined)
              ])
            : ListView.builder(
                itemCount: cases.length,
                itemBuilder: (_, i) {
                  final c = cases[i];
                  return Card(
                    child: ListTile(
                      title: Text(employeeLabel(c['employee'])),
                      subtitle: Text(str(c['package']?['name'])),
                      trailing: StatusBadge(str(c['status'])),
                      onTap: () => _detail(c),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
