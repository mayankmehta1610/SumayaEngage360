import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

class TimesheetsScreen extends StatefulWidget {
  const TimesheetsScreen({super.key});
  @override
  State<TimesheetsScreen> createState() => _TimesheetsScreenState();
}

class _TimesheetsScreenState extends State<TimesheetsScreen> {
  List mine = [], pending = [], projects = [];
  final _d = DateFormat('d MMM');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try { mine = asList(await ApiClient.get('/timesheets/mine')); } catch (_) {}
    try { pending = asList(await ApiClient.get('/timesheets/pending-approval')); } catch (_) {}
    try { projects = asList(await ApiClient.get('/projects')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _act(Future Function() fn, String ok) async {
    try { await fn(); if (mounted) showOk(context, ok); await _load(); }
    catch (e) { if (mounted) showError(context, e); }
  }

  DateTime _dt(dynamic v) => DateTime.parse(v.toString()).toLocal();

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.symmetric(vertical: 12), children: [
        if (pending.isNotEmpty)
          SectionCard(
            title: 'Awaiting my approval',
            child: Column(children: [
              for (final t in pending)
                RowTile(
                  title: '${t['employee']['user']['firstName']} ${t['employee']['user']['lastName']} — ${t['type']}',
                  subtitle: '${_d.format(_dt(t['periodStart']))} – ${_d.format(_dt(t['periodEnd']))}'
                      ' · ${(t['entries'] as List).fold<num>(0, (s, e) => s + num.parse(e['hours'].toString()))}h',
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    IconButton(icon: const Icon(Icons.check_circle, color: Colors.green),
                        onPressed: () => _act(() => ApiClient.post('/timesheets/${t['id']}/approve', {'note': 'ok'}), 'Approved')),
                    IconButton(icon: const Icon(Icons.cancel, color: Colors.red),
                        onPressed: () => _act(() => ApiClient.post('/timesheets/${t['id']}/discard', {'note': ''}), 'Discarded')),
                  ]),
                ),
            ]),
          ),
        SectionCard(
          title: 'My timesheets',
          trailing: FilledButton(onPressed: _createDialog, child: const Text('+ New')),
          child: Column(children: [
            for (final t in mine.take(10))
              RowTile(
                title: '${t['type']}${t['project'] != null ? ' · ${t['project']['name']}' : ''}',
                subtitle: '${_d.format(_dt(t['periodStart']))} – ${_d.format(_dt(t['periodEnd']))}'
                    '${t['actionNote'] != null ? ' · ${t['actionNote']}' : ''}',
                trailing: t['status'] == 'DRAFT' || t['status'] == 'DISCARDED'
                    ? TextButton(
                        onPressed: () => _act(() => ApiClient.post('/timesheets/${t['id']}/submit'), 'Submitted'),
                        child: const Text('Submit'))
                    : StatusBadge(t['status'].toString()),
              ),
            if (mine.isEmpty) const EmptyState('No timesheets yet — tap + New.'),
          ]),
        ),
      ]),
    );
  }

  Future<void> _createDialog() async {
    String type = 'CLIENT';
    String? projectId = projects.isNotEmpty ? projects.first['id'] as String : null;
    final hours = TextEditingController(text: '8');
    final task = TextEditingController();
    DateTime day = DateTime.now();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('New timesheet'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField(
              value: type,
              items: const [
                DropdownMenuItem(value: 'CLIENT', child: Text('Client (billable)')),
                DropdownMenuItem(value: 'INTERNAL', child: Text('Internal')),
              ],
              onChanged: (v) => setD(() => type = v as String),
              decoration: const InputDecoration(labelText: 'Type'),
            ),
            if (type == 'CLIENT' && projects.isNotEmpty) ...[
              const SizedBox(height: 8),
              DropdownButtonFormField(
                value: projectId,
                items: [for (final p in projects) DropdownMenuItem(value: p['id'] as String, child: Text(p['name'].toString()))],
                onChanged: (v) => projectId = v,
                decoration: const InputDecoration(labelText: 'Project'),
              ),
            ],
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () async {
                final r = await showDatePicker(context: ctx, initialDate: day,
                    firstDate: DateTime.now().subtract(const Duration(days: 30)), lastDate: DateTime.now());
                if (r != null) setD(() => day = r);
              },
              child: Text('Day: ${DateFormat('d MMM').format(day)}'),
            ),
            TextField(controller: hours, keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Hours')),
            TextField(controller: task, decoration: const InputDecoration(labelText: 'Task')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                _act(() async {
                  final ts = await ApiClient.post('/timesheets', {
                    'type': type,
                    if (type == 'CLIENT' && projectId != null) 'projectId': projectId,
                    'periodStart': day.toUtc().toIso8601String(),
                    'periodEnd': day.toUtc().toIso8601String(),
                    'entries': [
                      {'workDate': day.toUtc().toIso8601String(), 'hours': num.tryParse(hours.text) ?? 8, 'task': task.text},
                    ],
                  });
                  await ApiClient.post('/timesheets/${ts['id']}/submit');
                }, 'Timesheet submitted');
              },
              child: const Text('Create + submit'),
            ),
          ],
        ),
      ),
    );
  }
}
