import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  List punches = [],
      balances = [],
      types = [],
      myLeave = [],
      pendingLeave = [],
      pendingRegs = [];
  Map<String, dynamic>? today;
  final _d = DateFormat('d MMM');
  final _t = DateFormat('HH:mm');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      punches = asList(await ApiClient.get('/attendance/mine'));
      final key = DateTime.now().toUtc().toIso8601String().substring(0, 10);
      today = null;
      for (final p in punches) {
        if ((p['workDate'] ?? '').toString().startsWith(key)) {
          today = p as Map<String, dynamic>;
          break;
        }
      }
      balances = asList(await ApiClient.get('/leave/balances/mine'));
      types = asList(await ApiClient.get('/leave/types'));
      myLeave = asList(await ApiClient.get('/leave/requests/mine'));
      pendingLeave = asList(await ApiClient.get('/leave/requests/pending'));
      pendingRegs =
          asList(await ApiClient.get('/attendance/regularizations/pending'));
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _act(Future Function() fn, [String? ok]) async {
    try {
      await fn();
      if (ok != null && mounted) showOk(context, ok);
      await _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  DateTime? _dt(dynamic v) =>
      v == null ? null : DateTime.tryParse(v.toString())?.toLocal();

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            SectionCard(
              title: 'Today',
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(today?['inAt'] != null
                        ? 'In ${_t.format(_dt(today!['inAt'])!)}'
                            '${today?['outAt'] != null ? '  ·  Out ${_t.format(_dt(today!['outAt'])!)}' : ''}'
                            '${today?['late'] == true ? '  (late)' : ''}'
                        : 'Not checked in yet'),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(
                        child: FilledButton.icon(
                          icon: const Icon(Icons.login),
                          onPressed: today?['inAt'] != null
                              ? null
                              : () => _act(
                                  () => ApiClient.post('/attendance/check-in'),
                                  'Checked in'),
                          label: const Text('Check in'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.logout),
                          onPressed: today?['inAt'] == null ||
                                  today?['outAt'] != null
                              ? null
                              : () => _act(
                                  () => ApiClient.post('/attendance/check-out'),
                                  'Checked out'),
                          label: const Text('Check out'),
                        ),
                      ),
                    ]),
                  ]),
            ),
            SectionCard(
              title: 'Leave balances',
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                for (final b in balances)
                  Chip(
                      label: Text(
                          '${b['leaveType']['code']}: ${b['remaining']} of ${b['allocated']}')),
                if (balances.isEmpty)
                  const EmptyState('No leave types configured.'),
              ]),
            ),
            SectionCard(
              title: 'Apply for leave',
              trailing: FilledButton(
                  onPressed: types.isEmpty ? null : _applyLeaveDialog,
                  child: const Text('Apply')),
              child: Column(children: [
                for (final r in myLeave.take(6))
                  RowTile(
                    title:
                        '${r['leaveType']['code']} · ${_d.format(_dt(r['startDate'])!)} – ${_d.format(_dt(r['endDate'])!)} (${r['days']}d)',
                    subtitle: r['reason']?.toString(),
                    trailing: StatusBadge(r['status'].toString()),
                  ),
                if (myLeave.isEmpty) const EmptyState('No leave requests yet.'),
              ]),
            ),
            if (pendingLeave.isNotEmpty || pendingRegs.isNotEmpty)
              SectionCard(
                title: 'Waiting for my approval',
                child: Column(children: [
                  for (final r in pendingLeave)
                    RowTile(
                      title:
                          '${r['employee']?['user']?['firstName']} ${r['employee']?['user']?['lastName']} — ${r['leaveType']['name']} (${r['days']}d)',
                      subtitle: r['reason']?.toString(),
                      trailing: _approveButtons(
                        () => _act(
                            () => ApiClient.post(
                                '/leave/requests/${r['id']}/approve',
                                {'note': ''}),
                            'Approved'),
                        () => _act(
                            () => ApiClient.post(
                                '/leave/requests/${r['id']}/reject',
                                {'note': ''}),
                            'Rejected'),
                      ),
                    ),
                  for (final r in pendingRegs)
                    RowTile(
                      title:
                          'Attendance fix — ${r['employee']?['user']?['firstName']} (${_d.format(_dt(r['workDate'])!)})',
                      subtitle: r['reason']?.toString(),
                      trailing: _approveButtons(
                        () => _act(
                            () => ApiClient.post(
                                '/attendance/regularizations/${r['id']}/approve',
                                {'note': ''}),
                            'Approved'),
                        () => _act(
                            () => ApiClient.post(
                                '/attendance/regularizations/${r['id']}/reject',
                                {'note': ''}),
                            'Rejected'),
                      ),
                    ),
                ]),
              ),
            SectionCard(
              title: 'My attendance (30 days)',
              child: Column(children: [
                for (final p in punches.take(10))
                  RowTile(
                    title: _d.format(_dt(p['workDate'])!),
                    subtitle:
                        'In ${p['inAt'] != null ? _t.format(_dt(p['inAt'])!) : '—'} · Out ${p['outAt'] != null ? _t.format(_dt(p['outAt'])!) : '—'}',
                    trailing: p['late'] == true
                        ? const StatusBadge('LATE')
                        : const StatusBadge('OK'),
                  ),
                if (punches.isEmpty) const EmptyState('No punches yet.'),
              ]),
            ),
          ]),
    );
  }

  Widget _approveButtons(VoidCallback ok, VoidCallback no) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton(
            icon: const Icon(Icons.check_circle, color: Colors.green),
            onPressed: ok),
        IconButton(
            icon: const Icon(Icons.cancel, color: Colors.red), onPressed: no),
      ]);

  Future<void> _applyLeaveDialog() async {
    String? typeId = types.first['id'] as String;
    DateTime from = DateTime.now().add(const Duration(days: 1));
    DateTime to = from;
    final reason = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Apply for leave'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField(
              value: typeId,
              items: [
                for (final t in types)
                  DropdownMenuItem(
                      value: t['id'] as String,
                      child: Text('${t['name']} (${t['code']})'))
              ],
              onChanged: (v) => typeId = v,
              decoration: const InputDecoration(labelText: 'Type'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () async {
                final r = await showDateRangePicker(
                    context: ctx,
                    firstDate:
                        DateTime.now().subtract(const Duration(days: 30)),
                    lastDate: DateTime.now().add(const Duration(days: 365)));
                if (r != null) {
                  setD(() {
                    from = r.start;
                    to = r.end;
                  });
                }
              },
              child: Text(
                  '${DateFormat('d MMM').format(from)} → ${DateFormat('d MMM').format(to)}'),
            ),
            const SizedBox(height: 8),
            TextField(
                controller: reason,
                decoration: const InputDecoration(labelText: 'Reason')),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                _act(
                    () => ApiClient.post('/leave/requests', {
                          'leaveTypeId': typeId,
                          'startDate': from.toUtc().toIso8601String(),
                          'endDate': to.toUtc().toIso8601String(),
                          'reason': reason.text,
                        }),
                    'Leave request submitted');
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }
}
