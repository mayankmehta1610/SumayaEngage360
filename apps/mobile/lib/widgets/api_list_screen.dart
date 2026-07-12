import 'package:flutter/material.dart';
import '../core/api_client.dart';
import 'common.dart';

typedef ItemBuilder = Widget Function(
    BuildContext context, dynamic item, int index);
typedef StringFn = String Function(dynamic item);

/// Generic pull-to-refresh list wired to a GET endpoint.
class ApiListScreen extends StatefulWidget {
  final String title;
  final String endpoint;
  final Map<String, String>? query;
  final StringFn titleOf;
  final StringFn? subtitleOf;
  final StringFn? statusOf;
  final Widget? floatingAction;
  final Future<void> Function(dynamic item)? onTap;
  final ItemBuilder? itemBuilder;

  const ApiListScreen({
    super.key,
    required this.title,
    required this.endpoint,
    this.query,
    required this.titleOf,
    this.subtitleOf,
    this.statusOf,
    this.floatingAction,
    this.onTap,
    this.itemBuilder,
  });

  @override
  State<ApiListScreen> createState() => _ApiListScreenState();
}

class _ApiListScreenState extends State<ApiListScreen> {
  List items = [];
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
      final data = await ApiClient.get(widget.endpoint, widget.query);
      if (mounted) setState(() => items = asList(data));
    } catch (e) {
      if (mounted) setState(() => error = formatError(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      floatingActionButton: widget.floatingAction,
      body: RefreshIndicator(
        onRefresh: _load,
        child: loading && items.isEmpty
            ? ListView(children: const [LoadingOverlay()])
            : error != null && items.isEmpty
                ? ListView(children: [ErrorState(error!, onRetry: _load)])
                : items.isEmpty
                    ? ListView(children: [
                        EmptyState('No ${widget.title.toLowerCase()} found.',
                            icon: Icons.inbox_outlined)
                      ])
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (ctx, i) {
                          final item = items[i];
                          if (widget.itemBuilder != null) {
                            return widget.itemBuilder!(ctx, item, i);
                          }
                          final status = widget.statusOf?.call(item);
                          final showStatus =
                              status != null && status.isNotEmpty;
                          return Card(
                            child: ListTile(
                              title: Text(widget.titleOf(item),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: widget.subtitleOf != null
                                  ? Text(widget.subtitleOf!(item))
                                  : null,
                              trailing: showStatus ? StatusBadge(status) : null,
                              onTap: widget.onTap != null
                                  ? () => widget.onTap!(item)
                                  : null,
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
