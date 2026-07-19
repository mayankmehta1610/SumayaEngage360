import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/api_client.dart';
import '../../widgets/common.dart';

/// Company intranet — mobile parity for the SharePoint-style web portal.
/// Browse department hubs, the 3-level category tree and published content
/// (articles, documents, videos, posters, links). Security levels and the
/// view-only (no-download) flag are enforced by the server.
class IntranetScreen extends StatefulWidget {
  const IntranetScreen({super.key});
  @override
  State<IntranetScreen> createState() => _IntranetScreenState();
}

class _IntranetScreenState extends State<IntranetScreen> {
  bool loading = true;
  String? error;

  List<Map<String, dynamic>> banners = [], departments = [], pinned = [], recent = [];

  // department drill-down
  Map<String, dynamic>? dept;
  List<Map<String, dynamic>> tree = [], deptContent = [];
  String? selectedCategoryId;
  bool deptLoading = false;

  List<Map<String, dynamic>> _maps(dynamic v) => asList(v)
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();

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
      final home = Map<String, dynamic>.from(await ApiClient.get('/intranet/home') as Map);
      banners = _maps(home['banners']);
      departments = _maps(home['departments']);
      pinned = _maps(home['pinned']);
      recent = _maps(home['recent']);
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Future<void> _openDepartment(Map<String, dynamic> d) async {
    setState(() {
      dept = d;
      deptLoading = true;
      selectedCategoryId = null;
      tree = [];
      deptContent = [];
    });
    try {
      final results = await Future.wait([
        ApiClient.get('/intranet/departments/${d['id']}/categories'),
        ApiClient.get('/intranet/content', {'departmentId': str(d['id'], '')}),
      ]);
      tree = _maps(results[0]);
      deptContent = _maps(results[1]);
    } catch (e) {
      if (mounted) showError(context, e);
    }
    if (mounted) setState(() => deptLoading = false);
  }

  Future<void> _filterCategory(String? categoryId) async {
    setState(() {
      selectedCategoryId = categoryId;
      deptLoading = true;
    });
    try {
      final query = <String, String>{'departmentId': str(dept?['id'], '')};
      if (categoryId != null) query['categoryId'] = categoryId;
      deptContent = _maps(await ApiClient.get('/intranet/content', query));
    } catch (e) {
      if (mounted) showError(context, e);
    }
    if (mounted) setState(() => deptLoading = false);
  }

  /// Flatten the category tree with its depth for indented chips.
  List<(Map<String, dynamic>, int)> get flatTree {
    final out = <(Map<String, dynamic>, int)>[];
    void walk(List<Map<String, dynamic>> nodes, int depth) {
      for (final n in nodes) {
        out.add((n, depth));
        walk(_maps(n['children']), depth + 1);
      }
    }

    walk(tree, 0);
    return out;
  }

  Future<void> _openContent(Map<String, dynamic> item) async {
    Map<String, dynamic> full = item;
    try {
      full = Map<String, dynamic>.from(
          await ApiClient.get('/intranet/content/${item['id']}') as Map);
    } catch (_) {}
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _ContentSheet(item: full),
    );
  }

  IconData _typeIcon(String type) => switch (type) {
        'VIDEO' => Icons.play_circle_outline,
        'POSTER' => Icons.image_outlined,
        'DOCUMENT' => Icons.description_outlined,
        'LINK' => Icons.link,
        _ => Icons.article_outlined,
      };

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) return ErrorState(error!, onRetry: _load);
    if (dept != null) return _departmentView(context);
    return _homeView(context);
  }

  Widget _homeView(BuildContext context) {
    final theme = Theme.of(context);
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (banners.isNotEmpty)
            SizedBox(
              height: 130,
              child: PageView(
                children: [
                  for (final b in banners)
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        gradient: LinearGradient(colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.primary.withValues(alpha: .65),
                        ]),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(str(b['title'], ''),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800)),
                          if (str(b['subtitle'], '').isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(str(b['subtitle'], ''),
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 13)),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Department hubs',
            child: departments.isEmpty
                ? const EmptyState('No departments yet.',
                    icon: Icons.apartment_outlined)
                : Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final d in departments)
                        ActionChip(
                          avatar: Icon(
                              d['isMine'] == true
                                  ? Icons.star
                                  : Icons.apartment_outlined,
                              size: 16),
                          label: Text(
                              '${str(d['name'], '')} (${d['contentCount'] ?? 0})'),
                          onPressed: () => _openDepartment(d),
                        ),
                    ],
                  ),
          ),
          if (pinned.isNotEmpty)
            SectionCard(
              title: 'Featured',
              child: Column(children: [
                for (final c in pinned)
                  RowTile(
                    title: str(c['title'], ''),
                    subtitle:
                        '${str(c['type'], '')} · ${str(c['category']?['name'], 'General')}',
                    trailing: Icon(_typeIcon(str(c['type'], '')), size: 18),
                    onTap: () => _openContent(c),
                  ),
              ]),
            ),
          SectionCard(
            title: 'Latest updates',
            child: recent.isEmpty
                ? const EmptyState('Nothing published yet.',
                    icon: Icons.campaign_outlined)
                : Column(children: [
                    for (final c in recent)
                      RowTile(
                        title: str(c['title'], ''),
                        subtitle:
                            '${str(c['type'], '')} · ${c['viewCount'] ?? 0} views',
                        trailing: Icon(_typeIcon(str(c['type'], '')), size: 18),
                        onTap: () => _openContent(c),
                      ),
                  ]),
          ),
        ],
      ),
    );
  }

  Widget _departmentView(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Row(children: [
          IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => setState(() => dept = null),
          ),
          Expanded(
            child: Text(str(dept?['name'], ''),
                style:
                    const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          ),
        ]),
        if (flatTree.isNotEmpty)
          SectionCard(
            title: 'Browse',
            child: Wrap(spacing: 6, runSpacing: 6, children: [
              ChoiceChip(
                label: const Text('All content'),
                selected: selectedCategoryId == null,
                onSelected: (_) => _filterCategory(null),
              ),
              for (final (node, depth) in flatTree)
                ChoiceChip(
                  label: Text('${'—' * depth}${depth > 0 ? ' ' : ''}'
                      '${str(node['name'], '')} (${node['contentCount'] ?? 0})'),
                  selected: selectedCategoryId == node['id'],
                  onSelected: (_) => _filterCategory(str(node['id'], '')),
                ),
            ]),
          ),
        SectionCard(
          title: 'Content',
          child: deptLoading
              ? const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()))
              : deptContent.isEmpty
                  ? const EmptyState('No published content here yet.',
                      icon: Icons.folder_open)
                  : Column(children: [
                      for (final c in deptContent)
                        RowTile(
                          title: str(c['title'], ''),
                          subtitle:
                              '${str(c['type'], '')} · ${str(c['category']?['name'], 'General')}'
                              '${c['downloadable'] == false ? ' · view only' : ''}',
                          trailing:
                              Icon(_typeIcon(str(c['type'], '')), size: 18),
                          onTap: () => _openContent(c),
                        ),
                    ]),
        ),
      ],
    );
  }
}

/// Content detail sheet — article body, poster preview, download guard info.
class _ContentSheet extends StatelessWidget {
  final Map<String, dynamic> item;
  const _ContentSheet({required this.item});

  /// Plain-text form of the markdown article body.
  String get plainBody => str(item['body'], '')
      .replaceAll(RegExp(r'```[\s\S]*?```'), ' ')
      .replaceAllMapped(
          RegExp(r'\[([^\]]+)\]\([^)]*\)'), (m) => m.group(1) ?? '')
      .replaceAll(RegExp(r'[#>*`_]+'), '')
      .trim();

  @override
  Widget build(BuildContext context) {
    final type = str(item['type'], 'ARTICLE');
    final downloadable = item['downloadable'] != false;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .65,
      maxChildSize: .95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          Row(children: [
            StatusBadge(type),
            const SizedBox(width: 8),
            if (!downloadable)
              const StatusBadge('VIEW ONLINE ONLY'),
          ]),
          const SizedBox(height: 10),
          Text(str(item['title'], ''),
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            '${str(item['category']?['name'], 'General')} · ${item['viewCount'] ?? 0} views',
            style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
          ),
          const Divider(height: 24),
          if (str(item['summary'], '').isNotEmpty) ...[
            Text(str(item['summary'], ''),
                style: const TextStyle(
                    fontStyle: FontStyle.italic, fontSize: 13.5)),
            const SizedBox(height: 12),
          ],
          if (type == 'ARTICLE' && plainBody.isNotEmpty)
            Text(plainBody, style: const TextStyle(fontSize: 14, height: 1.5)),
          if (type == 'LINK') ...[
            const Text('External link:',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            SelectableText(str(item['externalUrl'], ''),
                style: const TextStyle(fontSize: 13)),
          ],
          if (type == 'POSTER' && item['fileId'] != null)
            _AuthImage(path: '/intranet/content/${item['id']}/file'),
          if (type == 'VIDEO' || type == 'DOCUMENT') ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                Icon(
                    type == 'VIDEO'
                        ? Icons.play_circle_outline
                        : Icons.description_outlined,
                    size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    downloadable
                        ? 'Open the web portal to ${type == 'VIDEO' ? 'play this video' : 'preview or download this document'}.'
                        : 'This item is view-only — it can be ${type == 'VIDEO' ? 'played' : 'previewed'} in the web portal but not downloaded.',
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}

/// Image loaded with the API auth headers (posters, covers, banners).
class _AuthImage extends StatelessWidget {
  final String path;
  const _AuthImage({required this.path});

  Future<http.Response> _fetch() {
    return http.get(
      Uri.parse('${ApiClient.base}$path'),
      headers: {
        if (ApiClient.signedIn) 'Authorization': 'Bearer ${ApiClient.rawToken}',
        if (ApiClient.tenant != null) 'x-tenant-id': ApiClient.tenant!,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<http.Response>(
      future: _fetch(),
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (snap.data!.statusCode >= 400) {
          return const EmptyState('Image unavailable.', icon: Icons.broken_image);
        }
        return ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.memory(snap.data!.bodyBytes, fit: BoxFit.contain),
        );
      },
    );
  }
}
