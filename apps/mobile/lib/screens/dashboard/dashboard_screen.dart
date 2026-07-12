import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/auth_service.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/module_drawer.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? k;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/dashboard/kpis');
      if (mounted) setState(() => k = data as Map<String, dynamic>);
    } catch (e) {
      if (mounted) setState(() => error = formatError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = k?['business'] as Map<String, dynamic>?;
    final p = k?['personal'] as Map<String, dynamic>?;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          if (error != null)
            Padding(padding: const EdgeInsets.all(16), child: Text(error!, style: const TextStyle(color: E360Theme.danger))),
          if (k == null && error == null)
            const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())),
          if (b != null && AuthService.isOps) ...[
            _header(context, 'Business'),
            _grid([
              KpiTile('${b['jobsPublished']}', 'Open jobs'),
              KpiTile('${b['applicationsTotal']}', 'Applications'),
              KpiTile('${b['candidates']}', 'Talent pool'),
              KpiTile('${b['shortlisted']}', 'Shortlisted', color: E360Theme.success),
              KpiTile('${b['employeesTotal']}', 'Employees'),
              KpiTile('${b['onboardingOpen']}', 'Onboarding', color: E360Theme.warning),
              KpiTile('${b['timesheetsSubmitted']}', 'Timesheets pending', color: E360Theme.warning),
              KpiTile('${b['exitsInFlight']}', 'Exits in progress', color: E360Theme.warning),
            ]),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Applications by stage', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  ...((b['applicationsByStatus'] as List?) ?? []).map((s) => _bar(
                        context, s['status'].toString(), (s['count'] as num).toInt(),
                        (b['applicationsTotal'] as num).toInt())),
                ]),
              ),
            ),
          ],
          if (p != null) ...[
            _header(context, 'My work'),
            _grid([
              KpiTile('${p['timesheetDrafts']}', 'Draft timesheets'),
              KpiTile('${p['trainingsToComplete']}', 'Trainings due', color: E360Theme.warning),
              KpiTile('${p['appraisalsAwaitingSelfReview']}', 'Self-reviews due', color: E360Theme.warning),
              KpiTile('${p['recognitionsReceived']}', 'Recognitions', color: E360Theme.success),
            ]),
            if ((k?['myApprovals'] ?? 0) > 0)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.pending_actions, color: E360Theme.warning),
                  title: Text('${k!['myApprovals']} item(s) waiting for YOUR approval',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  onTap: () => openModule(context, '/approvals'),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _header(BuildContext context, String text) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
        child: Text(text.toUpperCase(),
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800,
                letterSpacing: 1.1, color: Theme.of(context).hintColor)),
      );

  Widget _grid(List<Widget> tiles) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: GridView.count(
          crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 2.1,
          children: tiles,
        ),
      );

  Widget _bar(BuildContext context, String label, int count, int total) {
    final pct = total > 0 ? count / total : 0.0;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        SizedBox(width: 110, child: Text(label, style: const TextStyle(fontSize: 11))),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(value: pct, minHeight: 12,
                backgroundColor: Theme.of(context).dividerColor),
          ),
        ),
        SizedBox(width: 32, child: Text(' $count', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700))),
      ]),
    );
  }
}
