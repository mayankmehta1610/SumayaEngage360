import 'package:flutter/material.dart';
import '../core/api_client.dart';
import 'common.dart';

/// In-tab list (no scaffold) for use inside TabBarView.
class ApiTabList extends StatefulWidget {
  final String endpoint;
  final StringFn titleOf;
  final StringFn? subtitleOf;
  final StringFn? statusOf;
  final Future<void> Function(dynamic item)? onTap;

  const ApiTabList({
    super.key,
    required this.endpoint,
    required this.titleOf,
    this.subtitleOf,
    this.statusOf,
    this.onTap,
  });

  @override
  State<ApiTabList> createState() => _ApiTabListState();
}

class _ApiTabListState extends State<ApiTabList>
    with AutomaticKeepAliveClientMixin {
  List items = [];
  bool loading = true;
  String? error;

  @override
  bool get wantKeepAlive => true;

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
      final data = await ApiClient.get(widget.endpoint);
      if (mounted) setState(() => items = asList(data));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (loading && items.isEmpty) return const LoadingOverlay();
    if (error != null && items.isEmpty) {
      return ErrorState(error!, onRetry: _load);
    }
    if (items.isEmpty) {
      return const EmptyState('Nothing here yet.', icon: Icons.inbox_outlined);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (ctx, i) {
          final item = items[i];
          final status = widget.statusOf?.call(item);
          final showStatus = status != null && status.isNotEmpty;
          return Card(
            child: ListTile(
              title: Text(widget.titleOf(item),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: widget.subtitleOf != null
                  ? Text(widget.subtitleOf!(item))
                  : null,
              trailing: showStatus ? StatusBadge(status) : null,
              onTap: widget.onTap != null ? () => widget.onTap!(item) : null,
            ),
          );
        },
      ),
    );
  }
}

/// Tabbed screen with a single app bar.
class TabbedApiScreen extends StatefulWidget {
  final String title;
  final List<
      ({
        String label,
        String endpoint,
        StringFn titleOf,
        StringFn? subtitleOf,
        StringFn? statusOf
      })> tabs;

  const TabbedApiScreen({super.key, required this.title, required this.tabs});

  @override
  State<TabbedApiScreen> createState() => _TabbedApiScreenState();
}

class _TabbedApiScreenState extends State<TabbedApiScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tc;

  @override
  void initState() {
    super.initState();
    _tc = TabController(length: widget.tabs.length, vsync: this);
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
        title: Text(widget.title),
        bottom: TabBar(
          controller: _tc,
          isScrollable: widget.tabs.length > 3,
          tabs: [for (final t in widget.tabs) Tab(text: t.label)],
        ),
      ),
      body: TabBarView(
        controller: _tc,
        children: [
          for (final t in widget.tabs)
            ApiTabList(
              endpoint: t.endpoint,
              titleOf: t.titleOf,
              subtitleOf: t.subtitleOf,
              statusOf: t.statusOf,
            ),
        ],
      ),
    );
  }
}

typedef StringFn = String Function(dynamic item);
