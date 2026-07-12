import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/auth_service.dart';
import '../../widgets/common.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? me;
  List salary = [];
  Map<String, dynamic>? resignation;
  final _d = DateFormat('d MMM yyyy');
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try { me = await ApiClient.get('/employees/me') as Map<String, dynamic>?; } catch (_) {}
    try { salary = asList(await ApiClient.get('/employees/me/salary')); } catch (_) {}
    try { resignation = await ApiClient.get('/exit/resignations/mine') as Map<String, dynamic>?; } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return Scaffold(appBar: AppBar(title: const Text('My profile')), body: const LoadingOverlay());
    final u = AuthService.user;
    return Scaffold(
      appBar: AppBar(title: const Text('My profile')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            SectionCard(
              title: 'Account',
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(personName(u), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                Text(str(u?['email']), style: TextStyle(color: Theme.of(context).hintColor)),
                const SizedBox(height: 8),
                Wrap(spacing: 6, children: [
                  for (final r in AuthService.roles) Chip(label: Text(r, style: const TextStyle(fontSize: 11))),
                ]),
              ]),
            ),
            if (me != null) ...[
              SectionCard(
                title: 'Employment',
                trailing: StatusBadge(str(me!['status'])),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${me!['employeeCode']} · ${me!['designation']}'),
                  Text(str(me!['department']?['name']), style: TextStyle(color: Theme.of(context).hintColor)),
                  if (me!['manager'] != null)
                    Text('Manager: ${personName(me!['manager']?['user'])}', style: TextStyle(color: Theme.of(context).hintColor, fontSize: 12)),
                  if (me!['joinDate'] != null)
                    Text('Joined ${_d.format(DateTime.parse(me!['joinDate'].toString()))}',
                        style: TextStyle(color: Theme.of(context).hintColor, fontSize: 12)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    for (final s in (me!['skills'] as List? ?? []))
                      Chip(label: Text(s['skill']?['name']?.toString() ?? '', style: const TextStyle(fontSize: 11))),
                  ]),
                ]),
              ),
              if ((me!['allocations'] as List?)?.isNotEmpty == true)
                SectionCard(
                  title: 'Project allocations',
                  child: Column(
                    children: [
                      for (final a in me!['allocations'] as List)
                        RowTile(
                          title: str(a['project']?['name']),
                          subtitle: '${a['percentage'] ?? a['allocationPct']}% · ${str(a['project']?['location'])}',
                        ),
                    ],
                  ),
                ),
              if ((me!['assetAssignments'] as List?)?.isNotEmpty == true)
                SectionCard(
                  title: 'Assets issued',
                  child: Column(
                    children: [
                      for (final a in me!['assetAssignments'] as List)
                        RowTile(
                          title: str(a['asset']?['assetTag']),
                          subtitle: '${str(a['asset']?['category'])} · ${str(a['asset']?['model'])}',
                        ),
                    ],
                  ),
                ),
            ],
            if (salary.isNotEmpty)
              SectionCard(
                title: 'Salary history',
                child: Column(
                  children: [
                    for (final s in salary)
                      RowTile(
                        title: '₹ ${s['annualCtc']} / year',
                        subtitle: 'from ${_d.format(DateTime.parse(s['effectiveFrom'].toString()))}',
                        trailing: StatusBadge(s['isOffered'] == true ? 'OFFERED' : 'REVISION'),
                      ),
                  ],
                ),
              ),
            if (resignation != null && resignation!['status'] != null)
              SectionCard(
                title: 'Resignation',
                trailing: StatusBadge(str(resignation!['status'])),
                child: Text(str(resignation!['reason'])),
              ),
          ],
        ),
      ),
    );
  }
}
