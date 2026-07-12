import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

const _statuses = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'SELECTED',
  'OFFERED',
  'OFFER_ACCEPTED',
  'OFFER_DECLINED',
  'ONBOARDING',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

class ApplicationDetailScreen extends StatefulWidget {
  final String applicationId;
  const ApplicationDetailScreen({super.key, required this.applicationId});

  @override
  State<ApplicationDetailScreen> createState() =>
      _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  Map<String, dynamic>? app;
  List interviewers = [];
  bool loading = true;
  String? error;
  String _editStatus = 'APPLIED';
  final _d = DateFormat('d MMM y, HH:mm');

  bool get _isHr =>
      ApiClient.roles.any((r) => r == 'TENANT_ADMIN' || r == 'HR');

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      app = await ApiClient.get('/applications/${widget.applicationId}')
          as Map<String, dynamic>;
      _editStatus = app!['status']?.toString() ?? 'APPLIED';
      if (_isHr) {
        try {
          interviewers = asList(await ApiClient.get('/interviewers'));
        } catch (_) {}
      }
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _act(Future<void> Function() fn, [String? ok]) async {
    try {
      await fn();
      if (ok != null && mounted) showOk(context, ok);
      await _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Application')),
      body: loading
          ? const LoadingOverlay()
          : error != null
              ? ErrorState(error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      SectionCard(
                        title:
                            '${app!['candidate']?['firstName']} ${app!['candidate']?['lastName']}',
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(str(app!['candidate']?['email'])),
                              const SizedBox(height: 4),
                              Text('Role: ${str(app!['job']?['title'])}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              const SizedBox(height: 8),
                              StatusBadge(str(app!['status'])),
                            ]),
                      ),
                      if (_isHr) _statusSection(),
                      _interviewsSection(),
                      if (_isHr) _offerSection(),
                    ],
                  ),
                ),
    );
  }

  Widget _statusSection() {
    return SectionCard(
      title: 'Pipeline stage',
      child: Row(children: [
        Expanded(
          child: DropdownButtonFormField<String>(
            value:
                _statuses.contains(_editStatus) ? _editStatus : _statuses.first,
            items: [
              for (final s in _statuses)
                DropdownMenuItem(value: s, child: Text(s))
            ],
            onChanged: (v) => setState(() => _editStatus = v ?? _editStatus),
            decoration: const InputDecoration(labelText: 'Status'),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: () => _act(
              () => ApiClient.patch(
                  '/applications/${widget.applicationId}/status',
                  {'status': _editStatus}),
              'Status updated'),
          child: const Text('Update'),
        ),
      ]),
    );
  }

  Widget _interviewsSection() {
    final interviews = app!['interviews'] as List? ?? [];
    return SectionCard(
      title: 'Interview rounds',
      trailing: _isHr
          ? TextButton(
              onPressed: _scheduleInterview, child: const Text('Schedule'))
          : null,
      child: interviews.isEmpty
          ? const EmptyState('No interviews scheduled.')
          : Column(children: [
              for (final iv in interviews)
                RowTile(
                  title: '${iv['level']}. ${str(iv['name'])}',
                  subtitle: iv['scheduledAt'] != null
                      ? _d.format(DateTime.parse(iv['scheduledAt'].toString())
                          .toLocal())
                      : null,
                  trailing: StatusBadge(str(iv['result'], 'PENDING')),
                ),
            ]),
    );
  }

  Widget _offerSection() {
    final offer = app!['offer'];
    final status = app!['status']?.toString();
    if (offer != null) {
      return SectionCard(
        title: 'Offer',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${str(offer['designation'])} · ₹ ${offer['annualCtc']}'),
          Text('Joining: ${str(offer['joiningDate'])}'),
          const SizedBox(height: 8),
          StatusBadge(str(offer['status'])),
          if (offer['status'] == 'DRAFT')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: FilledButton(
                onPressed: () => _act(
                    () => ApiClient.post('/offers/${offer['id']}/send'),
                    'Offer sent'),
                child: const Text('Send offer'),
              ),
            ),
        ]),
      );
    }
    if (status == 'SELECTED') {
      return SectionCard(
        title: 'Offer',
        child: FilledButton(
            onPressed: _createOffer, child: const Text('Create offer')),
      );
    }
    return const SizedBox.shrink();
  }

  Future<void> _scheduleInterview() async {
    final name = TextEditingController(text: 'Technical');
    final level = TextEditingController(text: '1');
    String? interviewerId =
        interviewers.isNotEmpty ? interviewers.first['id'] as String? : null;
    DateTime when = DateTime.now().add(const Duration(days: 2));
    String mode = 'TEAMS';
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Schedule interview'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Round name')),
              TextField(
                  controller: level,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Level')),
              if (interviewers.isNotEmpty)
                DropdownButtonFormField(
                  value: interviewerId,
                  items: [
                    for (final i in interviewers)
                      DropdownMenuItem(
                          value: i['id'] as String, child: Text(personName(i)))
                  ],
                  onChanged: (v) => interviewerId = v,
                  decoration: const InputDecoration(labelText: 'Interviewer'),
                ),
              DropdownButtonFormField(
                value: mode,
                items: const [
                  DropdownMenuItem(value: 'TEAMS', child: Text('Teams')),
                  DropdownMenuItem(value: 'ZOOM', child: Text('Zoom')),
                  DropdownMenuItem(
                      value: 'IN_PERSON', child: Text('In person')),
                ],
                onChanged: (v) => setD(() => mode = v as String),
                decoration: const InputDecoration(labelText: 'Mode'),
              ),
              OutlinedButton(
                onPressed: () async {
                  final d = await showDatePicker(
                      context: ctx,
                      initialDate: when,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)));
                  if (d != null && ctx.mounted) {
                    final t = await showTimePicker(
                        context: ctx,
                        initialTime: TimeOfDay.fromDateTime(when));
                    if (t != null) {
                      setD(() => when =
                          DateTime(d.year, d.month, d.day, t.hour, t.minute));
                    }
                  }
                },
                child: Text(_d.format(when)),
              ),
            ]),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                _act(
                    () => ApiClient.post(
                            '/applications/${widget.applicationId}/interviews',
                            {
                              'level': int.tryParse(level.text) ?? 1,
                              'name': name.text,
                              if (interviewerId != null)
                                'interviewerId': interviewerId,
                              'scheduledAt': when.toUtc().toIso8601String(),
                              'mode': mode,
                            }),
                    'Interview scheduled');
              },
              child: const Text('Schedule'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createOffer() async {
    final designation = TextEditingController(text: str(app!['job']?['title']));
    final ctc = TextEditingController(text: '600000');
    final location =
        TextEditingController(text: str(app!['job']?['location'], 'Remote'));
    DateTime joining = DateTime.now().add(const Duration(days: 30));
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create offer'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: designation,
                decoration: const InputDecoration(labelText: 'Designation')),
            TextField(
                controller: ctc,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Annual CTC')),
            TextField(
                controller: location,
                decoration: const InputDecoration(labelText: 'Location')),
            OutlinedButton(
              onPressed: () async {
                final d = await showDatePicker(
                    context: ctx,
                    initialDate: joining,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)));
                if (d != null) setD(() => joining = d);
              },
              child: Text('Joining: ${DateFormat('d MMM y').format(joining)}'),
            ),
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                final annual = num.tryParse(ctc.text) ?? 0;
                _act(
                    () => ApiClient.post(
                            '/applications/${widget.applicationId}/offer', {
                          'designation': designation.text,
                          'annualCtc': annual,
                          'joiningDate': joining.toUtc().toIso8601String(),
                          'location': location.text,
                          'salaryBreakup': {
                            'basic': annual * 0.4,
                            'hra': annual * 0.2,
                            'special': annual * 0.4
                          },
                        }),
                    'Offer created');
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }
}
