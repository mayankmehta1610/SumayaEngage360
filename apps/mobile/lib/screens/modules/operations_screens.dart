import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/roles.dart';
import '../../widgets/common.dart';

// ── Candidates ───────────────────────────────────────────────────────────────

class CandidatesScreen extends StatefulWidget {
  const CandidatesScreen({super.key});
  @override
  State<CandidatesScreen> createState() => _CandidatesScreenState();
}

class _CandidatesScreenState extends State<CandidatesScreen> {
  List items = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try { items = asList(await ApiClient.get('/candidates')); } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _detail(dynamic c) async {
    try {
      final detail = await ApiClient.get('/candidates/${c['id']}') as Map<String, dynamic>;
      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          builder: (_, sc) => ListView(
            controller: sc,
            padding: const EdgeInsets.all(16),
            children: [
              Text('${detail['firstName']} ${detail['lastName']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              Text(str(detail['email'])),
              Text('Status: ${str(detail['status'])}'),
              const SizedBox(height: 12),
              const Text('Applications', style: TextStyle(fontWeight: FontWeight.w600)),
              for (final a in (detail['applications'] as List? ?? []))
                ListTile(
                  dense: true,
                  title: Text(str(a['job']?['title'])),
                  trailing: StatusBadge(str(a['status'])),
                ),
              if (canManageHr) ...[
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    try {
                      await ApiClient.post('/matching/parse-pending');
                      if (mounted) showOk(context, 'Resume parser triggered');
                      _load();
                    } catch (e) {
                      if (mounted) showError(context, e);
                    }
                  },
                  child: const Text('Parse pending resumes'),
                ),
              ],
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
      appBar: AppBar(title: const Text('Talent pool')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: items.isEmpty
                  ? ListView(children: const [EmptyState('No candidates.', icon: Icons.person_search)])
                  : ListView.builder(
                      itemCount: items.length,
                      itemBuilder: (_, i) {
                        final c = items[i];
                        return Card(
                          child: ListTile(
                            title: Text('${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim()),
                            subtitle: Text(str(c['email'])),
                            trailing: StatusBadge(str(c['status'], '')),
                            onTap: () => _detail(c),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── Clients ──────────────────────────────────────────────────────────────────

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});
  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  List items = [];

  Future<void> _load() async {
    try { items = asList(await ApiClient.get('/hiring-clients')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final slug = TextEditingController();
    final description = TextEditingController();
    var isInternal = false;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Add hiring client'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: slug, decoration: const InputDecoration(labelText: 'Careers URL slug')),
            TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
            SwitchListTile(title: const Text('Internal'), value: isInternal, onChanged: (v) => setD(() => isInternal = v)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/hiring-clients', {
                    'name': name.text,
                    'slug': slug.text,
                    'description': description.text,
                    'isInternal': isInternal,
                  });
                  if (mounted) showOk(context, 'Client added');
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

  Future<void> _editClient(dynamic c) async {
    final name = TextEditingController(text: str(c['name']));
    final description = TextEditingController(text: str(c['description']));
    var isInternal = c['isInternal'] == true;
    var isActive = c['isActive'] != false;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Edit client'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
            SwitchListTile(title: const Text('Internal'), value: isInternal, onChanged: (v) => setD(() => isInternal = v)),
            SwitchListTile(title: const Text('Active'), value: isActive, onChanged: (v) => setD(() => isActive = v)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.patch('/hiring-clients/${c['id']}', {
                    'name': name.text,
                    'description': description.text,
                    'isInternal': isInternal,
                    'isActive': isActive,
                  });
                  if (mounted) showOk(context, 'Client updated');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hiring clients')),
      floatingActionButton: canManageHr ? FloatingActionButton(onPressed: _create, child: const Icon(Icons.add)) : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: items.isEmpty
            ? ListView(children: const [EmptyState('No clients.')])
            : ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, i) {
                  final c = items[i];
                  return Card(
                    child: ListTile(
                      title: Text(str(c['name'])),
                      subtitle: Text(str(c['slug'])),
                      trailing: StatusBadge(c['isActive'] == true ? 'ACTIVE' : 'OFF'),
                      onTap: canManageHr ? () => _editClient(c) : null,
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ── Assets ───────────────────────────────────────────────────────────────────

class AssetsScreen extends StatefulWidget {
  const AssetsScreen({super.key});
  @override
  State<AssetsScreen> createState() => _AssetsScreenState();
}

class _AssetsScreenState extends State<AssetsScreen> {
  List assets = [], employees = [];

  Future<void> _load() async {
    try { assets = asList(await ApiClient.get('/assets')); } catch (_) {}
    try { employees = asList(await ApiClient.get('/employees')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _register() async {
    final name = TextEditingController();
    final tag = TextEditingController();
    final category = TextEditingController(text: 'LAPTOP');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Register asset'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: tag, decoration: const InputDecoration(labelText: 'Asset tag')),
          TextField(controller: category, decoration: const InputDecoration(labelText: 'Category')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/assets', {'name': name.text, 'assetTag': tag.text, 'category': category.text});
                if (mounted) showOk(context, 'Asset registered');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Register'),
          ),
        ],
      ),
    );
  }

  Future<void> _assign(dynamic asset) async {
    if (employees.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Assign ${asset['name']}'),
        content: DropdownButtonFormField(
          value: empId,
          items: [for (final e in employees) DropdownMenuItem(value: e['id'] as String, child: Text(employeeLabel(e)))],
          onChanged: (v) => empId = v,
          decoration: const InputDecoration(labelText: 'Employee'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/assets/${asset['id']}/assign/$empId');
                if (mounted) showOk(context, 'Asset assigned');
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

  Future<void> _returnAsset(dynamic assignment) async {
    try {
      await ApiClient.post('/assets/assignments/${assignment['id']}/return', {'condition': 'Good'});
      if (mounted) showOk(context, 'Asset returned');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Assets')),
      floatingActionButton: canManageHr ? FloatingActionButton(onPressed: _register, child: const Icon(Icons.add)) : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: assets.isEmpty
            ? ListView(children: const [EmptyState('No assets.', icon: Icons.laptop_mac)])
            : ListView.builder(
                itemCount: assets.length,
                itemBuilder: (_, i) {
                  final a = assets[i];
                  final allocs = a['assignments'] as List?;
                  final assignment = allocs != null && allocs.isNotEmpty ? allocs.first as Map : null;
                  return Card(
                    child: ExpansionTile(
                      title: Text(str(a['name'] ?? a['assetTag'])),
                      subtitle: Text(str(a['category'])),
                      trailing: StatusBadge(str(a['status'])),
                      children: [
                        if (assignment != null)
                          ListTile(
                            title: Text('Assigned to ${employeeLabel(assignment['employee'])}'),
                            trailing: canManageHr
                                ? TextButton(onPressed: () => _returnAsset(assignment), child: const Text('Return'))
                                : null,
                          )
                        else if (canManageHr)
                          ListTile(
                            title: const Text('Unassigned'),
                            trailing: TextButton(onPressed: () => _assign(a), child: const Text('Assign')),
                          ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ── Manpower ─────────────────────────────────────────────────────────────────

class ManpowerScreen extends StatefulWidget {
  const ManpowerScreen({super.key});
  @override
  State<ManpowerScreen> createState() => _ManpowerScreenState();
}

class _ManpowerScreenState extends State<ManpowerScreen> {
  List items = [];

  Future<void> _load() async {
    try { items = asList(await ApiClient.get('/manpower')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _create() async {
    final role = TextEditingController();
    final count = TextEditingController(text: '1');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New manpower request'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: role, decoration: const InputDecoration(labelText: 'Role / designation')),
          TextField(controller: count, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Headcount')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/manpower', {'role': role.text, 'count': int.tryParse(count.text) ?? 1});
                if (mounted) showOk(context, 'Request created');
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

  Future<void> _act(String id, String action) async {
    try {
      await ApiClient.patch('/manpower/$id/$action');
      if (mounted) showOk(context, action == 'submit' ? 'Submitted' : 'Approved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manpower')),
      floatingActionButton: FloatingActionButton(onPressed: _create, child: const Icon(Icons.add)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: items.isEmpty
            ? ListView(children: const [EmptyState('No requests.')])
            : ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, i) {
                  final m = items[i];
                  final status = str(m['status']);
                  return Card(
                    child: ListTile(
                      title: Text('${str(m['role'] ?? m['designation'])} — ${m['count'] ?? m['headcount'] ?? ''}'),
                      subtitle: Text(str(m['department']?['name'] ?? m['project']?['name'])),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          StatusBadge(status),
                          if (status == 'DRAFT')
                            IconButton(icon: const Icon(Icons.send), onPressed: () => _act(m['id'].toString(), 'submit')),
                          if (status == 'SUBMITTED' && canManageHr)
                            IconButton(icon: const Icon(Icons.check), onPressed: () => _act(m['id'].toString(), 'approve')),
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

// ── Projects ─────────────────────────────────────────────────────────────────

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});
  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  List projects = [], clients = [], employees = [];

  Future<void> _load() async {
    try { projects = asList(await ApiClient.get('/projects')); } catch (_) {}
    try { clients = asList(await ApiClient.get('/hiring-clients')); } catch (_) {}
    try { employees = asList(await ApiClient.get('/employees')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final code = TextEditingController();
    final location = TextEditingController(text: 'Remote');
    String? clientId;
    String? managerId;
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create project'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
              TextField(controller: location, decoration: const InputDecoration(labelText: 'Location')),
              if (clients.isNotEmpty)
                DropdownButtonFormField(
                  value: clientId,
                  items: [
                    const DropdownMenuItem(value: null, child: Text('— internal —')),
                    for (final c in clients) DropdownMenuItem(value: c['id'] as String, child: Text(str(c['name']))),
                  ],
                  onChanged: (v) => setD(() => clientId = v),
                  decoration: const InputDecoration(labelText: 'Client'),
                ),
              if (employees.isNotEmpty)
                DropdownButtonFormField(
                  value: managerId,
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Manager…')),
                    for (final e in employees) DropdownMenuItem(value: e['id'] as String, child: Text(employeeLabel(e))),
                  ],
                  onChanged: (v) => setD(() => managerId = v),
                  decoration: const InputDecoration(labelText: 'Project manager'),
                ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/projects', {
                    'name': name.text,
                    'code': code.text,
                    'location': location.text,
                    if (clientId != null) 'hiringClientId': clientId,
                    if (managerId != null) 'managerId': managerId,
                  });
                  if (mounted) showOk(context, 'Project created');
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

  Future<void> _allocate(dynamic project) async {
    if (employees.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    final pct = TextEditingController(text: '100');
    DateTime from = DateTime.now();
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text('Allocate to ${project['name']}'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField(
              value: empId,
              items: [for (final e in employees) DropdownMenuItem(value: e['id'] as String, child: Text(employeeLabel(e)))],
              onChanged: (v) => empId = v,
              decoration: const InputDecoration(labelText: 'Employee'),
            ),
            TextField(controller: pct, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '% allocation')),
            OutlinedButton(
              onPressed: () async {
                final d = await showDatePicker(context: ctx, initialDate: from, firstDate: DateTime.now().subtract(const Duration(days: 30)), lastDate: DateTime.now().add(const Duration(days: 365)));
                if (d != null) setD(() => from = d);
              },
              child: Text('From: ${from.toIso8601String().substring(0, 10)}'),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/projects/${project['id']}/allocations', {
                    'employeeId': empId,
                    'allocationPct': int.tryParse(pct.text) ?? 100,
                    'effectiveFrom': from.toUtc().toIso8601String(),
                  });
                  if (mounted) showOk(context, 'Allocated');
                  _load();
                } catch (e) {
                  if (mounted) showError(context, e);
                }
              },
              child: const Text('Allocate'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Projects')),
      floatingActionButton: canManageHr ? FloatingActionButton(onPressed: _create, child: const Icon(Icons.add)) : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: projects.isEmpty
            ? ListView(children: const [EmptyState('No projects.', icon: Icons.folder_open)])
            : ListView.builder(
                itemCount: projects.length,
                itemBuilder: (_, i) {
                  final p = projects[i];
                  final allocs = p['allocations'] as List? ?? [];
                  return Card(
                    child: ExpansionTile(
                      title: Text(str(p['name'])),
                      subtitle: Text('${str(p['client']?['name'] ?? 'internal')} · ${str(p['code'])}'),
                      trailing: StatusBadge(str(p['status'])),
                      children: [
                        for (final a in allocs)
                          ListTile(
                            dense: true,
                            title: Text(employeeLabel(a['employee'])),
                            subtitle: Text('${a['allocationPct']}%'),
                          ),
                        if (canManageHr || isManager)
                          ListTile(
                            leading: const Icon(Icons.person_add),
                            title: const Text('Allocate employee'),
                            onTap: () => _allocate(p),
                          ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ── Onboarding ───────────────────────────────────────────────────────────────

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  List cases = [], requirements = [];

  Future<void> _load() async {
    try { cases = asList(await ApiClient.get('/onboarding/cases')); } catch (_) {}
    try { requirements = asList(await ApiClient.get('/onboarding/requirements')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _addReq() async {
    final country = TextEditingController(text: 'IN');
    final code = TextEditingController();
    final name = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add document requirement'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: country, decoration: const InputDecoration(labelText: 'Country')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/onboarding/requirements', {'country': country.text, 'code': code.text, 'name': name.text});
                if (mounted) showOk(context, 'Requirement added');
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

  Future<void> _verify(String docId, bool approve) async {
    try {
      await ApiClient.post('/onboarding/documents/$docId/verify', {
        'approve': approve,
        if (!approve) 'rejectionReason': 'Not legible / mismatch',
      });
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _approveCase(String caseId) async {
    try {
      await ApiClient.post('/onboarding/cases/$caseId/approve');
      if (mounted) showOk(context, 'Onboarding approved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Onboarding'),
        actions: [if (canManageHr) IconButton(icon: const Icon(Icons.add), onPressed: _addReq)],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 8),
          children: [
            if (requirements.isNotEmpty)
              SectionCard(
                title: 'Document requirements',
                child: Column(
                  children: [
                    for (final r in requirements)
                      RowTile(title: '${r['code']} — ${r['name']}', subtitle: 'Country: ${r['country']}'),
                  ],
                ),
              ),
            for (final c in cases)
              Card(
                child: ExpansionTile(
                  title: Text(employeeLabel(c['employee'])),
                  subtitle: Text(str(c['template']?['name'] ?? c['stage'])),
                  trailing: StatusBadge(str(c['status'])),
                  children: [
                    for (final d in (c['employee']?['documents'] as List? ?? []))
                      ListTile(
                        title: Text(str(d['code'])),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            StatusBadge(str(d['status'])),
                            if (d['status'] == 'SUBMITTED' && canManageHr) ...[
                              IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _verify(d['id'].toString(), true)),
                              IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _verify(d['id'].toString(), false)),
                            ],
                          ],
                        ),
                      ),
                    if (c['status'] != 'COMPLETED' && canManageHr)
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: FilledButton(onPressed: () => _approveCase(c['id'].toString()), child: const Text('Approve onboarding')),
                      ),
                  ],
                ),
              ),
            if (cases.isEmpty) const EmptyState('No onboarding cases.'),
          ],
        ),
      ),
    );
  }
}

// ── BGC Admin ────────────────────────────────────────────────────────────────

class BgcAdminScreen extends StatefulWidget {
  const BgcAdminScreen({super.key});
  @override
  State<BgcAdminScreen> createState() => _BgcAdminScreenState();
}

class _BgcAdminScreenState extends State<BgcAdminScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  List checks = [], vendors = [], employees = [], packages = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try { checks = asList(await ApiClient.get('/bgc/checks')); } catch (_) {}
    try { vendors = asList(await ApiClient.get('/bgc/vendors')); } catch (_) {}
    try { employees = asList(await ApiClient.get('/employees')); } catch (_) {}
    try { packages = asList(await ApiClient.get('/masters/bgv-packages')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _submitBgc() async {
    if (employees.isEmpty || packages.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    String? pkgId = packages.first['id'] as String?;
    String? vendorId = vendors.isNotEmpty ? vendors.first['id'] as String? : null;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Submit BGC check'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField(
            value: empId,
            items: [for (final e in employees) DropdownMenuItem(value: e['id'] as String, child: Text(employeeLabel(e)))],
            onChanged: (v) => empId = v,
            decoration: const InputDecoration(labelText: 'Employee'),
          ),
          DropdownButtonFormField(
            value: pkgId,
            items: [for (final p in packages) DropdownMenuItem(value: p['id'] as String, child: Text(str(p['name'])))],
            onChanged: (v) => pkgId = v,
            decoration: const InputDecoration(labelText: 'Package'),
          ),
          if (vendors.isNotEmpty)
            DropdownButtonFormField(
              value: vendorId,
              items: [for (final v in vendors) DropdownMenuItem(value: v['id'] as String, child: Text(str(v['name'])))],
              onChanged: (v) => vendorId = v,
              decoration: const InputDecoration(labelText: 'Vendor'),
            ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/bgc/employees/$empId/submit', {
                  'packageId': pkgId,
                  if (vendorId != null) 'vendorId': vendorId,
                });
                if (mounted) showOk(context, 'BGC submitted');
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

  Future<void> _addVendor() async {
    final name = TextEditingController();
    final email = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add BGC vendor'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/bgc/vendors', {'name': name.text, 'email': email.text});
                if (mounted) showOk(context, 'Vendor added');
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

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Background checks'),
        bottom: const TabBar(tabs: [Tab(text: 'Checks'), Tab(text: 'Vendors')]),
        actions: [
          if (canManageHr)
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'submit') _submitBgc();
                if (v == 'vendor') _addVendor();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'submit', child: Text('Submit check')),
                PopupMenuItem(value: 'vendor', child: Text('Add vendor')),
              ],
              icon: const Icon(Icons.add),
            ),
        ],
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          RefreshIndicator(
            onRefresh: _load,
            child: checks.isEmpty
                ? ListView(children: const [EmptyState('No checks.')])
                : ListView.builder(
                    itemCount: checks.length,
                    itemBuilder: (_, i) {
                      final c = checks[i];
                      return Card(
                        child: ListTile(
                          title: Text(employeeLabel(c['employee'])),
                          subtitle: Text(str(c['package']?['name'])),
                          trailing: StatusBadge(str(c['status'])),
                        ),
                      );
                    },
                  ),
          ),
          RefreshIndicator(
            onRefresh: _load,
            child: vendors.isEmpty
                ? ListView(children: const [EmptyState('No vendors.')])
                : ListView.builder(
                    itemCount: vendors.length,
                    itemBuilder: (_, i) {
                      final v = vendors[i];
                      return Card(
                        child: ListTile(title: Text(str(v['name'])), subtitle: Text(str(v['email']))),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Preboarding ──────────────────────────────────────────────────────────────

class PreboardingScreen extends StatefulWidget {
  const PreboardingScreen({super.key});
  @override
  State<PreboardingScreen> createState() => _PreboardingScreenState();
}

class _PreboardingScreenState extends State<PreboardingScreen> {
  List tasks = [];

  Future<void> _load() async {
    try { tasks = asList(await ApiClient.get('/preboarding/tasks')); } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _complete(String id) async {
    try {
      await ApiClient.patch('/preboarding/tasks/$id/complete');
      if (mounted) showOk(context, 'Task completed');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _initTasks() async {
    final empId = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Init preboarding tasks'),
        content: TextField(controller: empId, decoration: const InputDecoration(labelText: 'Employee ID')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/preboarding/tasks/init/${empId.text}', {});
                if (mounted) showOk(context, 'Tasks initialized');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Init'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preboarding'),
        actions: [if (canManageHr) IconButton(icon: const Icon(Icons.playlist_add), onPressed: _initTasks)],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: tasks.isEmpty
            ? ListView(children: const [EmptyState('No preboarding tasks.')])
            : ListView.builder(
                itemCount: tasks.length,
                itemBuilder: (_, i) {
                  final t = tasks[i];
                  return Card(
                    child: ListTile(
                      title: Text(str(t['title'] ?? t['name'])),
                      subtitle: Text(employeeLabel(t['employee'])),
                      trailing: t['status'] != 'COMPLETED' && canManageHr
                          ? IconButton(icon: const Icon(Icons.check), onPressed: () => _complete(t['id'].toString()))
                          : StatusBadge(str(t['status'])),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
