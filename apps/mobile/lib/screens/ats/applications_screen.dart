import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';
import 'application_detail_screen.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  List items = [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      items = asList(await ApiClient.get('/applications'));
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Applications')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: loading && items.isEmpty
            ? ListView(children: const [LoadingOverlay()])
            : error != null && items.isEmpty
                ? ListView(children: [ErrorState(error!, onRetry: _load)])
                : items.isEmpty
                    ? ListView(children: const [EmptyState('No applications found.', icon: Icons.inbox_outlined)])
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final a = items[i];
                          return Card(
                            child: ListTile(
                              title: Text('${a['candidate']?['firstName']} ${a['candidate']?['lastName']}'.trim(),
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(str(a['job']?['title'])),
                              trailing: StatusBadge(str(a['status'])),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ApplicationDetailScreen(applicationId: a['id'] as String)),
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
