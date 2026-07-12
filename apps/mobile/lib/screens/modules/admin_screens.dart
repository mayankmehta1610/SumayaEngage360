import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/roles.dart';
import '../../widgets/common.dart';

// ── Users ────────────────────────────────────────────────────────────────────

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});
  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List users = [];
  bool loading = true;
  static const allRoles = ['HR', 'MANAGER', 'INTERVIEWER', 'BGC_VENDOR', 'TENANT_ADMIN', 'EMPLOYEE'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      users = asList(await ApiClient.get('/users')).map((u) {
        final m = Map<String, dynamic>.from(u as Map);
        m['_roles'] = List<String>.from((m['roles'] as List?)?.map((e) => e.toString()) ?? []);
        return m;
      }).toList();
    } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _create() async {
    final first = TextEditingController();
    final last = TextEditingController();
    final email = TextEditingController();
    final password = TextEditingController();
    final roles = <String>{'HR'};
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create user'),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: first, decoration: const InputDecoration(labelText: 'First name')),
              TextField(controller: last, decoration: const InputDecoration(labelText: 'Last name')),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
              TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
              const SizedBox(height: 8),
              Wrap(spacing: 4, children: [
                for (final r in allRoles)
                  FilterChip(
                    label: Text(r, style: const TextStyle(fontSize: 11)),
                    selected: roles.contains(r),
                    onSelected: (v) => setD(() => v ? roles.add(r) : roles.remove(r)),
                  ),
              ]),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/users', {
                    'firstName': first.text,
                    'lastName': last.text,
                    'email': email.text,
                    'password': password.text,
                    'roles': roles.toList(),
                  });
                  if (mounted) showOk(context, 'User created');
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

  Future<void> _saveAccess(Map u) async {
    try {
      await ApiClient.patch('/users/${u['id']}/access', {'roles': u['_roles']});
      if (mounted) showOk(context, 'Roles saved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _toggleActive(Map u) async {
    try {
      await ApiClient.patch('/users/${u['id']}/access', {'isActive': u['isActive'] != true});
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('User accounts')),
      floatingActionButton: FloatingActionButton(onPressed: _create, child: const Icon(Icons.add)),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: users.isEmpty
                  ? ListView(children: const [EmptyState('No users.', icon: Icons.people_outline)])
                  : ListView.builder(
                      itemCount: users.length,
                      itemBuilder: (_, i) {
                        final u = users[i];
                        final isMe = u['id'] == ApiClient.currentUser?['id'];
                        return Card(
                          child: ExpansionTile(
                            title: Text(personName(u)),
                            subtitle: Text(str(u['email'])),
                            trailing: StatusBadge(u['isActive'] == true ? 'ACTIVE' : 'OFF'),
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Wrap(spacing: 4, children: [
                                    for (final r in allRoles)
                                      FilterChip(
                                        label: Text(r, style: const TextStyle(fontSize: 10)),
                                        selected: (u['_roles'] as List).contains(r),
                                        onSelected: isMe
                                            ? null
                                            : (v) => setState(() {
                                                  if (v) {
                                                    (u['_roles'] as List).add(r);
                                                  } else {
                                                    (u['_roles'] as List).remove(r);
                                                  }
                                                }),
                                      ),
                                  ]),
                                  if (!isMe) ...[
                                    const SizedBox(height: 8),
                                    Row(children: [
                                      FilledButton(onPressed: () => _saveAccess(u), child: const Text('Save roles')),
                                      const SizedBox(width: 8),
                                      OutlinedButton(
                                        onPressed: () => _toggleActive(u),
                                        child: Text(u['isActive'] == true ? 'Disable' : 'Enable'),
                                      ),
                                    ]),
                                  ],
                                ]),
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

// ── Tenants ──────────────────────────────────────────────────────────────────

class TenantsScreen extends StatefulWidget {
  const TenantsScreen({super.key});
  @override
  State<TenantsScreen> createState() => _TenantsScreenState();
}

class _TenantsScreenState extends State<TenantsScreen> {
  List tenants = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try { tenants = asList(await ApiClient.get('/tenants')); } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _create() async {
    final name = TextEditingController();
    final code = TextEditingController();
    final adminEmail = TextEditingController();
    final adminPassword = TextEditingController(text: 'ChangeMe123!');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create tenant'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Company name')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Tenant code')),
          TextField(controller: adminEmail, decoration: const InputDecoration(labelText: 'Admin email')),
          TextField(controller: adminPassword, obscureText: true, decoration: const InputDecoration(labelText: 'Admin password')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/tenants', {
                  'name': name.text,
                  'code': code.text,
                  'adminEmail': adminEmail.text,
                  'adminPassword': adminPassword.text,
                });
                if (mounted) showOk(context, 'Tenant created');
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
      appBar: AppBar(title: const Text('Tenants')),
      floatingActionButton: FloatingActionButton(onPressed: _create, child: const Icon(Icons.add)),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: tenants.isEmpty
                  ? ListView(children: const [EmptyState('No tenants.', icon: Icons.business)])
                  : ListView.builder(
                      itemCount: tenants.length,
                      itemBuilder: (_, i) {
                        final t = tenants[i];
                        return Card(
                          child: ListTile(
                            title: Text(str(t['name'] ?? t['code'])),
                            subtitle: Text('Code: ${str(t['code'])}'),
                            trailing: StatusBadge(str(t['status'], 'ACTIVE')),
                            onTap: () => showModalBottomSheet(
                              context: context,
                              builder: (ctx) => Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(str(t['name']), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                                  Text('Code: ${str(t['code'])}'),
                                  Text('Status: ${str(t['status'])}'),
                                  if (t['createdAt'] != null) Text('Created: ${t['createdAt']}'),
                                ]),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── Org (departments & designations) ─────────────────────────────────────────

class OrgScreen extends StatefulWidget {
  const OrgScreen({super.key});
  @override
  State<OrgScreen> createState() => _OrgScreenState();
}

class _OrgScreenState extends State<OrgScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  List departments = [], designations = [], employees = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try { departments = asList(await ApiClient.get('/departments')); } catch (_) {}
    try { designations = asList(await ApiClient.get('/designations')); } catch (_) {}
    if (canManageHr) {
      try { employees = asList(await ApiClient.get('/employees')); } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  Future<void> _addDept() async {
    final name = TextEditingController();
    final code = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add department'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/departments', {'name': name.text, 'code': code.text});
                if (mounted) showOk(context, 'Department added');
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

  Future<void> _addDesig() async {
    final name = TextEditingController();
    final level = TextEditingController(text: '1');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add designation'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: level, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Level')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/designations', {'name': name.text, 'level': int.tryParse(level.text) ?? 1});
                if (mounted) showOk(context, 'Designation added');
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

  Future<void> _setHead(dynamic dept) async {
    if (employees.isEmpty) return;
    String? empId = employees.first['id'] as String?;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Set head — ${dept['name']}'),
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
                await ApiClient.post('/departments/${dept['id']}/head/$empId');
                if (mounted) showOk(context, 'Department head set');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Departments'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Departments'), Tab(text: 'Designations')]),
        actions: [
          if (canManageHr)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _tc.index == 0 ? _addDept() : _addDesig(),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: TabBarView(
          controller: _tc,
          children: [
            ListView.builder(
              itemCount: departments.length,
              itemBuilder: (_, i) {
                final d = departments[i];
                return Card(
                  child: ListTile(
                    title: Text(str(d['name'])),
                    subtitle: Text('Code: ${str(d['code'])} · Head: ${personName(d['head']?['user'])}'),
                    trailing: canManageHr ? IconButton(icon: const Icon(Icons.person), onPressed: () => _setHead(d)) : null,
                  ),
                );
              },
            ),
            ListView.builder(
              itemCount: designations.length,
              itemBuilder: (_, i) {
                final d = designations[i];
                return Card(
                  child: ListTile(title: Text(str(d['name'])), subtitle: Text('Level ${str(d['level'])}')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Org masters ──────────────────────────────────────────────────────────────

class OrgMastersScreen extends StatefulWidget {
  const OrgMastersScreen({super.key});
  @override
  State<OrgMastersScreen> createState() => _OrgMastersScreenState();
}

class _OrgMastersScreenState extends State<OrgMastersScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  final _tabs = [
    ('Legal entities', '/org-masters/legal-entities'),
    ('Locations', '/org-masters/locations'),
    ('Grades', '/org-masters/grades'),
    ('Business units', '/org-masters/business-units'),
    ('Cost centers', '/org-masters/cost-centers'),
    ('Employment types', '/org-masters/employment-types'),
  ];
  final _data = <int, List>{};

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: _tabs.length, vsync: this);
    _loadAll();
  }

  Future<void> _loadAll() async {
    for (var i = 0; i < _tabs.length; i++) {
      try { _data[i] = asList(await ApiClient.get(_tabs[i].$2)); } catch (_) { _data[i] = []; }
    }
    if (mounted) setState(() {});
  }

  Future<void> _add(int tab) async {
    final name = TextEditingController();
    final code = TextEditingController();
    final city = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Add ${_tabs[tab].$1.toLowerCase()}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
          if (tab == 1) TextField(controller: city, decoration: const InputDecoration(labelText: 'City')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final body = <String, dynamic>{'name': name.text, 'code': code.text};
                if (tab == 1 && city.text.isNotEmpty) body['city'] = city.text;
                await ApiClient.post(_tabs[tab].$2, body);
                if (mounted) showOk(context, 'Added');
                _loadAll();
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
        title: const Text('Org masters'),
        bottom: TabBar(controller: _tc, isScrollable: true, tabs: [for (final t in _tabs) Tab(text: t.$1)]),
        actions: [if (canManageHr) IconButton(icon: const Icon(Icons.add), onPressed: () => _add(_tc.index))],
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          for (var i = 0; i < _tabs.length; i++)
            RefreshIndicator(
              onRefresh: _loadAll,
              child: (_data[i] ?? []).isEmpty
                  ? ListView(children: [EmptyState('No ${_tabs[i].$1.toLowerCase()}.')])
                  : ListView.builder(
                      itemCount: (_data[i] ?? []).length,
                      itemBuilder: (_, j) {
                        final item = (_data[i] ?? [])[j];
                        return Card(
                          child: ListTile(
                            title: Text(str(item['name'])),
                            subtitle: Text('${str(item['code'])}${item['city'] != null ? ' · ${item['city']}' : ''}'),
                          ),
                        );
                      },
                    ),
            ),
        ],
      ),
    );
  }
}

// ── Masters ──────────────────────────────────────────────────────────────────

class MastersScreen extends StatefulWidget {
  const MastersScreen({super.key});
  @override
  State<MastersScreen> createState() => _MastersScreenState();
}

class _MastersScreenState extends State<MastersScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  List jobFamilies = [], bgvPackages = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try { jobFamilies = asList(await ApiClient.get('/masters/job-families')); } catch (_) {}
    try { bgvPackages = asList(await ApiClient.get('/masters/bgv-packages')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _addFamily() async {
    final name = TextEditingController();
    final code = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add job family'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/masters/job-families', {'name': name.text, 'code': code.text});
                if (mounted) showOk(context, 'Added');
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

  Future<void> _addBgv() async {
    final name = TextEditingController();
    final code = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add BGV package'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ApiClient.post('/masters/bgv-packages', {
                  'name': name.text,
                  'code': code.text,
                  'checks': ['ID', 'EMPLOYMENT'],
                });
                if (mounted) showOk(context, 'Added');
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
        title: const Text('Masters'),
        bottom: TabBar(controller: _tc, tabs: const [Tab(text: 'Job families'), Tab(text: 'BGV packages')]),
        actions: [
          if (canManageHr)
            IconButton(icon: const Icon(Icons.add), onPressed: () => _tc.index == 0 ? _addFamily() : _addBgv()),
        ],
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          _list(jobFamilies, 'job families'),
          _list(bgvPackages, 'BGV packages'),
        ],
      ),
    );
  }

  Widget _list(List data, String label) => RefreshIndicator(
        onRefresh: _load,
        child: data.isEmpty
            ? ListView(children: [EmptyState('No $label.')])
            : ListView.builder(
                itemCount: data.length,
                itemBuilder: (_, i) => Card(
                  child: ListTile(title: Text(str(data[i]['name'])), subtitle: Text(str(data[i]['code']))),
                ),
              ),
      );
}

// ── Notifications ────────────────────────────────────────────────────────────

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  List templates = [], deliveries = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 2, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try { templates = asList(await ApiClient.get('/notifications/templates')); } catch (_) {}
    try { deliveries = asList(await ApiClient.get('/notifications/deliveries')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _createTemplate() async {
    final name = TextEditingController();
    final code = TextEditingController();
    final body = TextEditingController();
    String channel = 'EMAIL';
    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('Create template'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
            DropdownButtonFormField(
              value: channel,
              items: const [
                DropdownMenuItem(value: 'EMAIL', child: Text('Email')),
                DropdownMenuItem(value: 'SMS', child: Text('SMS')),
                DropdownMenuItem(value: 'WHATSAPP', child: Text('WhatsApp')),
              ],
              onChanged: (v) => setD(() => channel = v as String),
              decoration: const InputDecoration(labelText: 'Channel'),
            ),
            TextField(controller: body, maxLines: 3, decoration: const InputDecoration(labelText: 'Body')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.pop(ctx);
                try {
                  await ApiClient.post('/notifications/templates', {
                    'name': name.text,
                    'code': code.text,
                    'channel': channel,
                    'body': body.text,
                  });
                  if (mounted) showOk(context, 'Template created');
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

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        bottom: const TabBar(tabs: [Tab(text: 'Templates'), Tab(text: 'Deliveries')]),
        actions: [if (canManageHr) IconButton(icon: const Icon(Icons.add), onPressed: _createTemplate)],
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          RefreshIndicator(
            onRefresh: _load,
            child: templates.isEmpty
                ? ListView(children: const [EmptyState('No templates.')])
                : ListView.builder(
                    itemCount: templates.length,
                    itemBuilder: (_, i) {
                      final t = templates[i];
                      return Card(
                        child: ListTile(
                          title: Text(str(t['name'] ?? t['code'])),
                          subtitle: Text(str(t['channel'])),
                        ),
                      );
                    },
                  ),
          ),
          RefreshIndicator(
            onRefresh: _load,
            child: deliveries.isEmpty
                ? ListView(children: const [EmptyState('No deliveries.')])
                : ListView.builder(
                    itemCount: deliveries.length,
                    itemBuilder: (_, i) {
                      final d = deliveries[i];
                      return Card(
                        child: ListTile(
                          title: Text(str(d['template']?['name'] ?? d['channel'])),
                          subtitle: Text(str(d['recipient'])),
                          trailing: StatusBadge(str(d['status'])),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Workflows ────────────────────────────────────────────────────────────────

class WorkflowsScreen extends StatefulWidget {
  const WorkflowsScreen({super.key});
  @override
  State<WorkflowsScreen> createState() => _WorkflowsScreenState();
}

class _WorkflowsScreenState extends State<WorkflowsScreen> {
  List workflows = [], delegations = [], breaches = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try { workflows = asList(await ApiClient.get('/approvals/workflows')); } catch (_) {}
    try { delegations = asList(await ApiClient.get('/approvals/delegations')); } catch (_) {}
    try { breaches = asList(await ApiClient.get('/approvals/sla-breaches')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _saveVersion(dynamic wf) async {
    final steps = wf['steps'] as List? ?? [];
    try {
      await ApiClient.post('/approvals/workflows/${wf['id']}/versions', {'steps': steps});
      if (mounted) showOk(context, 'Version saved');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Workflows'),
          bottom: const TabBar(tabs: [Tab(text: 'Workflows'), Tab(text: 'Delegations'), Tab(text: 'SLA breaches')]),
        ),
        body: TabBarView(
          children: [
            RefreshIndicator(
              onRefresh: _load,
              child: workflows.isEmpty
                  ? ListView(children: const [EmptyState('No workflows.')])
                  : ListView.builder(
                      itemCount: workflows.length,
                      itemBuilder: (_, i) {
                        final w = workflows[i];
                        return Card(
                          child: ListTile(
                            title: Text(str(w['name'])),
                            subtitle: Text('${str(w['entityType'])} · ${(w['steps'] as List?)?.length ?? 0} steps'),
                            trailing: canManageHr
                                ? IconButton(
                                    icon: const Icon(Icons.save),
                                    onPressed: () => _saveVersion(w),
                                    tooltip: 'Save version snapshot',
                                  )
                                : StatusBadge(str(w['status'], '')),
                          ),
                        );
                      },
                    ),
            ),
            RefreshIndicator(
              onRefresh: _load,
              child: delegations.isEmpty
                  ? ListView(children: const [EmptyState('No delegations.')])
                  : ListView.builder(
                      itemCount: delegations.length,
                      itemBuilder: (_, i) {
                        final d = delegations[i];
                        return Card(
                          child: ListTile(
                            title: Text(personName(d['fromUser'] ?? d['delegator'])),
                            subtitle: Text('→ ${personName(d['toUser'] ?? d['delegate'])}'),
                          ),
                        );
                      },
                    ),
            ),
            RefreshIndicator(
              onRefresh: _load,
              child: breaches.isEmpty
                  ? ListView(children: const [EmptyState('No SLA breaches.')])
                  : ListView.builder(
                      itemCount: breaches.length,
                      itemBuilder: (_, i) {
                        final b = breaches[i];
                        return Card(
                          child: ListTile(
                            title: Text(str(b['workflow']?['name'])),
                            subtitle: Text(str(b['entityType'])),
                            trailing: const StatusBadge('PENDING'),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Settings ─────────────────────────────────────────────────────────────────

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tc;
  List branches = [], shifts = [], flags = [], integrations = [], connections = [];

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: 4, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try { branches = asList(await ApiClient.get('/config/branches')); } catch (_) {}
    try { shifts = asList(await ApiClient.get('/config/shifts')); } catch (_) {}
    try { flags = asList(await ApiClient.get('/config/feature-flags')); } catch (_) {}
    try { integrations = asList(await ApiClient.get('/integrations')); } catch (_) {}
    try { connections = asList(await ApiClient.get('/integrations/connections')); } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _addBranch() async {
    final name = TextEditingController();
    final code = TextEditingController();
    await _simpleCreate('Add branch', [
      TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
      TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
    ], () => ApiClient.post('/config/branches', {'name': name.text, 'code': code.text}));
  }

  Future<void> _addShift() async {
    final name = TextEditingController();
    final start = TextEditingController(text: '09:00');
    final end = TextEditingController(text: '18:00');
    await _simpleCreate('Add shift', [
      TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
      TextField(controller: start, decoration: const InputDecoration(labelText: 'Start (HH:mm)')),
      TextField(controller: end, decoration: const InputDecoration(labelText: 'End (HH:mm)')),
    ], () => ApiClient.post('/config/shifts', {'name': name.text, 'startTime': start.text, 'endTime': end.text}));
  }

  Future<void> _addFlag() async {
    final name = TextEditingController();
    final code = TextEditingController();
    await _simpleCreate('Add feature flag', [
      TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
      TextField(controller: code, decoration: const InputDecoration(labelText: 'Code')),
    ], () => ApiClient.post('/config/feature-flags', {'name': name.text, 'code': code.text, 'enabled': false}));
  }

  Future<void> _toggleFlag(dynamic f) async {
    try {
      await ApiClient.patch('/config/feature-flags/${f['id']}', {'enabled': f['enabled'] != true});
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _simpleCreate(String title, List<Widget> fields, Future<void> Function() fn) async {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Column(mainAxisSize: MainAxisSize.min, children: fields),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await fn();
                if (mounted) showOk(context, 'Saved');
                _load();
              } catch (e) {
                if (mounted) showError(context, e);
              }
            },
            child: const Text('Save'),
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
        title: const Text('Settings'),
        bottom: TabBar(
          controller: _tc,
          isScrollable: true,
          tabs: const [Tab(text: 'Branches'), Tab(text: 'Shifts'), Tab(text: 'Flags'), Tab(text: 'Integrations')],
        ),
        actions: [
          if (canManageHr)
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'branch') _addBranch();
                if (v == 'shift') _addShift();
                if (v == 'flag') _addFlag();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'branch', child: Text('Add branch')),
                PopupMenuItem(value: 'shift', child: Text('Add shift')),
                PopupMenuItem(value: 'flag', child: Text('Add flag')),
              ],
              icon: const Icon(Icons.add),
            ),
        ],
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          _simpleList(branches, (b) => '${str(b['name'])} (${str(b['code'])})'),
          _simpleList(shifts, (s) => '${str(s['name'])}: ${s['startTime']} – ${s['endTime']}'),
          RefreshIndicator(
            onRefresh: _load,
            child: flags.isEmpty
                ? ListView(children: const [EmptyState('No flags.')])
                : ListView.builder(
                    itemCount: flags.length,
                    itemBuilder: (_, i) {
                      final f = flags[i];
                      return Card(
                        child: SwitchListTile(
                          title: Text(str(f['name'])),
                          subtitle: Text(str(f['code'])),
                          value: f['enabled'] == true,
                          onChanged: canManageHr ? (_) => _toggleFlag(f) : null,
                        ),
                      );
                    },
                  ),
          ),
          RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              children: [
                for (final c in connections)
                  Card(
                    child: ListTile(
                      title: Text(str(c['integration']?['name'] ?? c['code'])),
                      subtitle: Text(str(c['integration']?['description'])),
                      trailing: Switch(
                        value: c['enabled'] == true,
                        onChanged: canManageHr
                            ? (v) async {
                                try {
                                  await ApiClient.post('/integrations/connections', {
                                    'integrationId': c['integrationId'] ?? c['integration']?['id'],
                                    'enabled': v,
                                  });
                                  _load();
                                } catch (e) {
                                  if (mounted) showError(context, e);
                                }
                              }
                            : null,
                      ),
                    ),
                  ),
                if (connections.isEmpty && integrations.isEmpty) const EmptyState('No integrations.'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _simpleList(List data, String Function(dynamic) label) => RefreshIndicator(
        onRefresh: _load,
        child: data.isEmpty
            ? ListView(children: const [EmptyState('Nothing here.')])
            : ListView.builder(
                itemCount: data.length,
                itemBuilder: (_, i) => Card(child: ListTile(title: Text(label(data[i])))),
              ),
      );
}
