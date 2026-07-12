import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

class ApprovalsScreen extends StatefulWidget {
  const ApprovalsScreen({super.key});
  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  List pending = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try { pending = asList(await ApiClient.get('/approvals/pending')); } catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  Future<void> _act(String id, String action) async {
    try {
      await ApiClient.post('/approvals/$id/act', {'action': action});
      if (mounted) showOk(context, action == 'APPROVED' ? 'Approved' : 'Rejected');
      _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Approvals (${pending.length})')),
      body: loading
          ? const LoadingOverlay()
          : RefreshIndicator(
              onRefresh: _load,
              child: pending.isEmpty
                  ? ListView(children: const [EmptyState('Inbox zero — no pending approvals.', icon: Icons.check_circle_outline)])
                  : ListView.builder(
                      itemCount: pending.length,
                      itemBuilder: (_, i) {
                        final r = pending[i];
                        return Card(
                          child: ListTile(
                            title: Text('${r['entityType']} — ${r['workflow']?['name'] ?? ''}'),
                            subtitle: Text('Step ${r['currentStep']}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.check_circle, color: Colors.green),
                                  onPressed: () => _act(r['id'].toString(), 'APPROVED'),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.cancel, color: Colors.red),
                                  onPressed: () => _act(r['id'].toString(), 'REJECTED'),
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
