import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  List items = [];
  List clients = [];
  List employmentTypes = [];
  bool loading = true;
  String? error;

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
      items = asList(await ApiClient.get('/jobs'));
      try {
        clients = asList(await ApiClient.get('/hiring-clients'));
      } catch (_) {}
      try {
        employmentTypes =
            asList(await ApiClient.get('/org-masters/employment-types'));
      } catch (_) {}
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _createJob() async {
    final title = TextEditingController();
    final description = TextEditingController(text: 'Job description');
    final location = TextEditingController(text: 'Remote');
    final vacancies = TextEditingController(text: '1');
    String? clientId =
        clients.isNotEmpty ? clients.first['id'] as String? : null;
    String employmentType = employmentTypes.isNotEmpty
        ? str(employmentTypes.first['code'])
        : 'FULL_TIME';
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create job'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Title')),
            TextField(
                controller: description,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description')),
            TextField(
                controller: location,
                decoration: const InputDecoration(labelText: 'Location')),
            TextField(
                controller: vacancies,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Vacancies')),
            if (clients.isNotEmpty)
              DropdownButtonFormField(
                value: clientId,
                items: [
                  for (final c in clients)
                    DropdownMenuItem(
                        value: c['id'] as String, child: Text(str(c['name'])))
                ],
                onChanged: (v) => clientId = v,
                decoration: const InputDecoration(labelText: 'Hiring client'),
              ),
            if (employmentTypes.isNotEmpty)
              DropdownButtonFormField(
                value: employmentType,
                items: [
                  for (final et in employmentTypes)
                    DropdownMenuItem(
                        value: str(et['code']), child: Text(str(et['name'])))
                ],
                onChanged: (v) => employmentType = v as String,
                decoration: const InputDecoration(labelText: 'Employment type'),
              ),
          ]),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/jobs', {
                  'title': title.text,
                  'description': description.text,
                  'location': location.text,
                  'vacancies': int.tryParse(vacancies.text) ?? 1,
                  'employmentType': employmentType,
                  if (clientId != null) 'hiringClientId': clientId,
                  'interviewPlan': [
                    {'level': 1, 'name': 'Screening'},
                    {'level': 2, 'name': 'Technical'},
                  ],
                });
                if (mounted) showOk(context, 'Job created');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jobs')),
      floatingActionButton: FloatingActionButton(
          onPressed: _createJob, child: const Icon(Icons.add)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: loading && items.isEmpty
            ? ListView(children: const [LoadingOverlay()])
            : error != null && items.isEmpty
                ? ListView(children: [ErrorState(error!, onRetry: _load)])
                : items.isEmpty
                    ? ListView(children: const [
                        EmptyState('No jobs found.', icon: Icons.work_outline)
                      ])
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final j = items[i];
                          return Card(
                            child: ListTile(
                              title: Text(str(j['title']),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                  str(j['client']?['name'] ?? j['location'])),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  StatusBadge(str(j['status'])),
                                  if (j['status'] == 'DRAFT')
                                    IconButton(
                                      icon: const Icon(Icons.publish),
                                      onPressed: () async {
                                        try {
                                          await ApiClient.post(
                                              '/jobs/${j['id']}/publish');
                                          if (mounted) {
                                            showOk(context, 'Job published');
                                          }
                                          _load();
                                        } catch (e) {
                                          if (mounted) showError(context, e);
                                        }
                                      },
                                    ),
                                  IconButton(
                                    icon: const Icon(Icons.hub_outlined),
                                    onPressed: () async {
                                      try {
                                        final matches = asList(
                                            await ApiClient.get(
                                                '/jobs/${j['id']}/matches'));
                                        if (!mounted) return;
                                        await showModalBottomSheet(
                                          context: context,
                                          builder: (ctx) => ListView(
                                            children: [
                                              Padding(
                                                  padding:
                                                      const EdgeInsets.all(16),
                                                  child: Text(
                                                      'Matches for ${j['title']}',
                                                      style: const TextStyle(
                                                          fontWeight: FontWeight
                                                              .w700))),
                                              for (final m in matches)
                                                ListTile(
                                                    title: Text(
                                                        '${m['candidate']?['firstName']} ${m['candidate']?['lastName']}'),
                                                    subtitle: Text(
                                                        'Score: ${m['score'] ?? m['matchScore']}')),
                                              ListTile(
                                                title:
                                                    const Text('Run matching'),
                                                trailing: const Icon(
                                                    Icons.play_arrow),
                                                onTap: () async {
                                                  Navigator.pop(ctx);
                                                  try {
                                                    await ApiClient.post(
                                                        '/jobs/${j['id']}/match',
                                                        {'useAi': false});
                                                    if (mounted) {
                                                      showOk(context,
                                                          'Matching complete');
                                                    }
                                                    _load();
                                                  } catch (e) {
                                                    if (mounted) {
                                                      showError(context, e);
                                                    }
                                                  }
                                                },
                                              ),
                                            ],
                                          ),
                                        );
                                      } catch (e) {
                                        if (mounted) showError(context, e);
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
