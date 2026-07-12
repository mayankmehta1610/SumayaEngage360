import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';
import 'application_detail_screen.dart';

/// Lists applications that have offers or are in offer-related stages.
class OffersScreen extends StatefulWidget {
  const OffersScreen({super.key});

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> {
  List items = [];
  bool loading = true;
  String? error;

  static const _offerStatuses = {'OFFERED', 'OFFER_ACCEPTED', 'OFFER_DECLINED'};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try {
      final all = asList(await ApiClient.get('/applications'));
      items = all.where((a) {
        if (a is! Map) return false;
        if (a['offer'] != null) return true;
        return _offerStatuses.contains(a['status']?.toString());
      }).toList();
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Offers')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: loading && items.isEmpty
            ? ListView(children: const [LoadingOverlay()])
            : error != null && items.isEmpty
                ? ListView(children: [ErrorState(error!, onRetry: _load)])
                : items.isEmpty
                    ? ListView(children: const [EmptyState('No offers yet.', icon: Icons.local_offer_outlined)])
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final a = items[i];
                          final offer = a['offer'];
                          return Card(
                            child: ListTile(
                              title: Text('${a['candidate']?['firstName']} ${a['candidate']?['lastName']}',
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                offer != null
                                    ? '${str(offer['designation'])} · ₹ ${offer['annualCtc']}'
                                    : str(a['job']?['title']),
                              ),
                              trailing: StatusBadge(str(offer?['status'] ?? a['status'])),
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
