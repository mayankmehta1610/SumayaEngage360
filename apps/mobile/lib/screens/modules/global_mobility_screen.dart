import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../widgets/common.dart';

class GlobalMobilityScreen extends StatefulWidget {
  const GlobalMobilityScreen({super.key});
  @override
  State<GlobalMobilityScreen> createState() => _GlobalMobilityScreenState();
}

class _GlobalMobilityScreenState extends State<GlobalMobilityScreen>
    with SingleTickerProviderStateMixin {
  late final TabController tabs;
  List<Map<String, dynamic>> catalogue = [],
      cases = [],
      candidates = [],
      employerProfiles = [];
  Set<String> operating = {'IN'};
  String primary = 'IN', search = '';
  bool loading = true, saving = false;
  int page = 0;
  String? error;

  bool get canEdit =>
      ApiClient.roles.any((r) => r == 'TENANT_ADMIN' || r == 'HR');

  @override
  void initState() {
    super.initState();
    tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    tabs.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _maps(dynamic value) => asList(value)
      .whereType<Map>()
      .map((v) => Map<String, dynamic>.from(v))
      .toList();

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        loading = true;
        error = null;
      });
    }
    try {
      final values = await Future.wait([
        ApiClient.get('/jurisdictions/catalog'),
        ApiClient.get('/jurisdictions/tenant'),
        ApiClient.get('/jurisdictions/work-authorizations'),
        ApiClient.get('/candidates'),
        ApiClient.get('/jurisdictions/employer-profiles'),
      ]);
      final config = Map<String, dynamic>.from(values[1] as Map);
      catalogue = _maps(values[0]);
      cases = _maps(values[2]);
      final candidateData = values[3] is Map && values[3]['data'] != null
          ? values[3]['data']
          : values[3];
      candidates = _maps(candidateData);
      employerProfiles = _maps(values[4]);
      operating = Set<String>.from(
          (config['operatingCountries'] as List? ?? const ['IN'])
              .map((v) => v.toString()));
      primary = str(config['primaryCountry'], 'IN');
    } catch (e) {
      error = formatError(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Map<String, dynamic>? _definition(String code) {
    for (final item in catalogue) {
      if (item['code'] == code) return item;
    }
    return null;
  }

  String _countryName(String code) => str(_definition(code)?['name'], code);

  List<Map<String, dynamic>> _authorizations(String code) =>
      ((_definition(code)?['authorizationTypes'] as List?) ?? const [])
          .whereType<Map>()
          .map((v) => Map<String, dynamic>.from(v))
          .toList();

  Future<void> _save() async {
    if (operating.isEmpty) {
      showError(context, 'Select at least one operating country.');
      return;
    }
    if (!operating.contains(primary)) primary = operating.first;
    setState(() => saving = true);
    try {
      await ApiClient.put('/jurisdictions/tenant', {
        'primaryCountry': primary,
        'operatingCountries': operating.toList(),
      });
      if (mounted) showOk(context, 'Country workflow configuration saved');
      await _load();
    } catch (e) {
      if (mounted) showError(context, e);
    }
    if (mounted) setState(() => saving = false);
  }

  Future<void> _createCase() async {
    if (candidates.isEmpty || operating.isEmpty) {
      showError(context, 'Add a candidate and enable a country first.');
      return;
    }
    String candidateId = str(candidates.first['id']);
    String country = operating.contains('IN') ? 'IN' : operating.first;
    String authorization = _authorizations(country).isEmpty
        ? ''
        : str(_authorizations(country).first['code']);
    final employer = TextEditingController();
    final expiry = TextEditingController();
    final notes = TextEditingController();
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialog) => AlertDialog(
          title: const Text('New work authorization case'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                DropdownButtonFormField<String>(
                  initialValue: candidateId,
                  decoration: const InputDecoration(labelText: 'Candidate *'),
                  items: [
                    for (final c in candidates)
                      DropdownMenuItem(
                          value: str(c['id']), child: Text(personName(c))),
                  ],
                  onChanged: (v) => candidateId = v ?? candidateId,
                ),
                DropdownButtonFormField<String>(
                  initialValue: country,
                  decoration:
                      const InputDecoration(labelText: 'Work country *'),
                  items: [
                    for (final code in operating)
                      DropdownMenuItem(
                          value: code, child: Text(_countryName(code))),
                  ],
                  onChanged: (v) => setDialog(() {
                    country = v ?? country;
                    final options = _authorizations(country);
                    authorization =
                        options.isEmpty ? '' : str(options.first['code']);
                  }),
                ),
                DropdownButtonFormField<String>(
                  key: ValueKey(country),
                  initialValue: authorization.isEmpty ? null : authorization,
                  decoration:
                      const InputDecoration(labelText: 'Authorization type *'),
                  items: [
                    for (final option in _authorizations(country))
                      DropdownMenuItem(
                          value: str(option['code']),
                          child: Text(str(option['label']))),
                  ],
                  onChanged: (v) => authorization = v ?? '',
                ),
                TextField(
                    controller: employer,
                    decoration:
                        const InputDecoration(labelText: 'Employer / sponsor')),
                TextField(
                    controller: expiry,
                    decoration: const InputDecoration(
                        labelText: 'Expiry date', hintText: 'YYYY-MM-DD')),
                TextField(
                    controller: notes,
                    maxLines: 3,
                    decoration: const InputDecoration(
                        labelText: 'Assessment notes and restrictions')),
              ]),
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                child: const Text('Create case')),
          ],
        ),
      ),
    );
    if (accepted != true || authorization.isEmpty) return;
    try {
      await ApiClient.post('/jurisdictions/work-authorizations', {
        'candidateId': candidateId,
        'jurisdictionCode': country,
        'authorizationType': authorization,
        if (employer.text.trim().isNotEmpty)
          'employerName': employer.text.trim(),
        if (expiry.text.trim().isNotEmpty)
          'expiresAt': DateTime.parse(expiry.text.trim()).toIso8601String(),
        if (notes.text.trim().isNotEmpty) 'notes': notes.text.trim(),
      });
      if (mounted) showOk(context, 'Work authorization case created');
      await _load();
      tabs.animateTo(2);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _createEmployerProfile() async {
    if (operating.isEmpty) {
      return showError(context, 'Enable an operating country first.');
    }
    String country = operating.contains('IN') ? 'IN' : operating.first,
        memberState = '',
        profileName = '';
    final textValues = <String, TextEditingController>{};
    final boolValues = <String, bool?>{};
    final accepted = await showDialog<bool>(
        context: context,
        builder: (dialogContext) =>
            StatefulBuilder(builder: (context, setDialog) {
              final fields =
                  ((_definition(country)?['employerFields'] as List?) ??
                          const [])
                      .whereType<Map>()
                      .map((v) => Map<String, dynamic>.from(v))
                      .toList();
              return AlertDialog(
                  title: const Text('Employer country profile'),
                  content: SizedBox(
                      width: 560,
                      child: SingleChildScrollView(
                          child:
                              Column(mainAxisSize: MainAxisSize.min, children: [
                        TextFormField(
                            decoration: const InputDecoration(
                                labelText: 'Profile / legal entity name *'),
                            onChanged: (v) => profileName = v),
                        DropdownButtonFormField<String>(
                            initialValue: country,
                            decoration:
                                const InputDecoration(labelText: 'Country *'),
                            items: [
                              for (final code in operating)
                                DropdownMenuItem(
                                    value: code,
                                    child: Text(_countryName(code)))
                            ],
                            onChanged: (v) => setDialog(() {
                                  country = v ?? country;
                                  textValues.clear();
                                  boolValues.clear();
                                })),
                        if (country == 'EU')
                          TextFormField(
                              decoration: const InputDecoration(
                                  labelText: 'EU member state *'),
                              onChanged: (v) => memberState = v.toUpperCase()),
                        for (final field in fields)
                          if (field['type'] == 'BOOLEAN')
                            DropdownButtonFormField<bool>(
                                decoration: InputDecoration(
                                    labelText:
                                        '${str(field['label'])}${field['required'] == true ? ' *' : ''}'),
                                items: const [
                                  DropdownMenuItem(
                                      value: true, child: Text('Yes')),
                                  DropdownMenuItem(
                                      value: false, child: Text('No'))
                                ],
                                onChanged: (v) =>
                                    boolValues[str(field['key'])] = v)
                          else
                            TextFormField(
                                controller: textValues.putIfAbsent(
                                    str(field['key']),
                                    TextEditingController.new),
                                maxLines: field['type'] == 'TEXTAREA' ? 3 : 1,
                                decoration: InputDecoration(
                                    labelText:
                                        '${str(field['label'])}${field['required'] == true ? ' *' : ''}')),
                      ]))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(dialogContext, false),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () => Navigator.pop(dialogContext, true),
                        child: const Text('Save for review'))
                  ]);
            }));
    if (accepted != true || profileName.trim().isEmpty) return;
    final definitionFields =
        ((_definition(country)?['employerFields'] as List?) ?? const [])
            .whereType<Map>();
    final data = <String, dynamic>{}, identifiers = <String, dynamic>{};
    for (final raw in definitionFields) {
      final field = Map<String, dynamic>.from(raw);
      final key = str(field['key']);
      final value = field['type'] == 'BOOLEAN'
          ? boolValues[key]
          : textValues[key]?.text.trim();
      if (value != null && value.toString().isNotEmpty) {
        (field['sensitive'] == true ? identifiers : data)[key] = value;
      }
    }
    try {
      await ApiClient.put('/jurisdictions/employer-profiles', {
        'profileName': profileName.trim(),
        'jurisdictionCode': country,
        if (memberState.isNotEmpty) 'memberStateCode': memberState,
        'data': data,
        'identifiers': identifiers,
        'completionStatus': 'READY_FOR_REVIEW'
      });
      if (mounted) showOk(context, 'Employer country profile saved');
      await _load();
      tabs.animateTo(1);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _createCandidateProfile() async {
    if (operating.isEmpty || candidates.isEmpty) {
      return showError(context, 'Enable a country and add a candidate first.');
    }
    String country = operating.contains('IN') ? 'IN' : operating.first,
        candidateId = str(candidates.first['id']),
        nationality = '',
        residence = '',
        memberState = '';
    final textValues = <String, TextEditingController>{};
    final boolValues = <String, bool?>{};
    final accepted = await showDialog<bool>(
        context: context,
        builder: (dialogContext) =>
            StatefulBuilder(builder: (context, setDialog) {
              final fields =
                  ((_definition(country)?['candidateFields'] as List?) ??
                          const [])
                      .whereType<Map>()
                      .map((v) => Map<String, dynamic>.from(v))
                      .where((v) => v['key'] != 'nationality')
                      .toList();
              return AlertDialog(
                  title: const Text('Candidate country profile'),
                  content: SizedBox(
                      width: 560,
                      child: SingleChildScrollView(
                          child:
                              Column(mainAxisSize: MainAxisSize.min, children: [
                        DropdownButtonFormField<String>(
                            initialValue: candidateId,
                            decoration:
                                const InputDecoration(labelText: 'Candidate *'),
                            items: [
                              for (final c in candidates)
                                DropdownMenuItem(
                                    value: str(c['id']),
                                    child: Text(personName(c)))
                            ],
                            onChanged: (v) => candidateId = v ?? candidateId),
                        DropdownButtonFormField<String>(
                            initialValue: country,
                            decoration:
                                const InputDecoration(labelText: 'Country *'),
                            items: [
                              for (final code in operating)
                                DropdownMenuItem(
                                    value: code,
                                    child: Text(_countryName(code)))
                            ],
                            onChanged: (v) => setDialog(() {
                                  country = v ?? country;
                                  textValues.clear();
                                  boolValues.clear();
                                })),
                        if (country == 'EU')
                          TextFormField(
                              decoration: const InputDecoration(
                                  labelText: 'EU member state *'),
                              onChanged: (v) => memberState = v.toUpperCase()),
                        TextFormField(
                            decoration: const InputDecoration(
                                labelText: 'Nationality *'),
                            onChanged: (v) => nationality = v),
                        TextFormField(
                            decoration: const InputDecoration(
                                labelText: 'Residence country'),
                            onChanged: (v) => residence = v.toUpperCase()),
                        for (final field in fields)
                          if (field['type'] == 'BOOLEAN')
                            DropdownButtonFormField<bool>(
                                decoration: InputDecoration(
                                    labelText:
                                        '${str(field['label'])}${field['required'] == true ? ' *' : ''}'),
                                items: const [
                                  DropdownMenuItem(
                                      value: true, child: Text('Yes')),
                                  DropdownMenuItem(
                                      value: false, child: Text('No'))
                                ],
                                onChanged: (v) =>
                                    boolValues[str(field['key'])] = v)
                          else
                            TextFormField(
                                controller: textValues.putIfAbsent(
                                    str(field['key']),
                                    TextEditingController.new),
                                maxLines: field['type'] == 'TEXTAREA' ? 3 : 1,
                                decoration: InputDecoration(
                                    labelText:
                                        '${str(field['label'])}${field['required'] == true ? ' *' : ''}')),
                      ]))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(dialogContext, false),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () => Navigator.pop(dialogContext, true),
                        child: const Text('Save for review'))
                  ]);
            }));
    if (accepted != true) return;
    final definitionFields =
        ((_definition(country)?['candidateFields'] as List?) ?? const [])
            .whereType<Map>();
    final data = <String, dynamic>{}, identifiers = <String, dynamic>{};
    for (final raw in definitionFields) {
      final field = Map<String, dynamic>.from(raw);
      final key = str(field['key']);
      if (key == 'nationality') continue;
      final value = field['type'] == 'BOOLEAN'
          ? boolValues[key]
          : textValues[key]?.text.trim();
      if (value != null && value.toString().isNotEmpty) {
        (field['sensitive'] == true ? identifiers : data)[key] = value;
      }
    }
    try {
      await ApiClient.put('/jurisdictions/candidates/$candidateId/profile', {
        'jurisdictionCode': country,
        if (memberState.isNotEmpty) 'memberStateCode': memberState,
        'nationality': nationality,
        if (residence.isNotEmpty) 'residenceCountry': residence,
        'personalData': data,
        'identifiers': identifiers,
        'consents': {'capturedAt': DateTime.now().toIso8601String()},
        'completionStatus': 'READY_FOR_REVIEW'
      });
      if (mounted) showOk(context, 'Candidate country profile saved');
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  List<Map<String, dynamic>> get filteredCases {
    final q = search.trim().toLowerCase();
    final result = cases.where((item) {
      if (q.isEmpty) return true;
      final candidate = item['candidate'] as Map? ?? const {};
      return [
        item['caseNumber'],
        item['jurisdictionCode'],
        item['authorizationType'],
        item['status'],
        item['employerName'],
        candidate['firstName'],
        candidate['lastName']
      ].any((v) => str(v).toLowerCase().contains(q));
    }).toList();
    result.sort((a, b) =>
        str(a['expiresAt'], '9999').compareTo(str(b['expiresAt'], '9999')));
    return result;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Global mobility'),
          actions: [
            if (canEdit)
              PopupMenuButton<String>(
                  onSelected: (value) => value == 'employer'
                      ? _createEmployerProfile()
                      : _createCandidateProfile(),
                  itemBuilder: (_) => const [
                        PopupMenuItem(
                            value: 'employer',
                            child: Text('Add employer profile')),
                        PopupMenuItem(
                            value: 'candidate',
                            child: Text('Add candidate profile'))
                      ]),
            IconButton(onPressed: _load, icon: const Icon(Icons.refresh))
          ],
          bottom: TabBar(controller: tabs, tabs: const [
            Tab(text: 'Countries', icon: Icon(Icons.public)),
            Tab(text: 'Profiles', icon: Icon(Icons.business_outlined)),
            Tab(text: 'Cases', icon: Icon(Icons.badge_outlined)),
          ]),
        ),
        floatingActionButton: canEdit
            ? FloatingActionButton.extended(
                onPressed: _createCase,
                icon: const Icon(Icons.add),
                label: const Text('New case'))
            : null,
        body: loading
            ? const LoadingOverlay()
            : error != null
                ? ErrorState(error!, onRetry: _load)
                : TabBarView(
                    controller: tabs,
                    children: [_countries(), _profiles(), _cases()]),
      );

  Widget _profiles() => ListView(padding: const EdgeInsets.all(12), children: [
        Row(children: [
          Expanded(
              child: FilledButton.icon(
                  onPressed: canEdit ? _createEmployerProfile : null,
                  icon: const Icon(Icons.business_outlined),
                  label: const Text('Employer profile'))),
          const SizedBox(width: 8),
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: canEdit ? _createCandidateProfile : null,
                  icon: const Icon(Icons.person_outline),
                  label: const Text('Candidate profile')))
        ]),
        const SizedBox(height: 12),
        if (employerProfiles.isEmpty)
          const EmptyState('No employer country profiles.',
              icon: Icons.business_outlined)
        else
          for (final item in employerProfiles)
            Card(
                child: ListTile(
                    title: Text(str(item['profileName'])),
                    subtitle: Text(
                        '${_countryName(str(item['jurisdictionCode']))}${str(item['memberStateCode']).isEmpty ? '' : ' / ${str(item['memberStateCode'])}'}'),
                    trailing:
                        StatusBadge(str(item['completionStatus'], 'DRAFT')))),
      ]);

  Widget _countries() => ListView(
        padding: const EdgeInsets.all(12),
        children: [
          SectionCard(
            title: 'India-first operating countries',
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                'Country selection controls currency, timezone, required fields, evidence and lifecycle stages.',
                style: TextStyle(color: Theme.of(context).hintColor),
              ),
              const SizedBox(height: 12),
              Wrap(spacing: 8, runSpacing: 6, children: [
                for (final item in catalogue)
                  FilterChip(
                    label: Text(str(item['name'])),
                    selected: operating.contains(item['code']),
                    onSelected: !canEdit
                        ? null
                        : (selected) => setState(() {
                              final code = str(item['code']);
                              selected
                                  ? operating.add(code)
                                  : operating.remove(code);
                              if (!operating.contains(primary) &&
                                  operating.isNotEmpty) {
                                primary = operating.first;
                              }
                            }),
                  ),
              ]),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: operating.contains(primary) ? primary : null,
                decoration:
                    const InputDecoration(labelText: 'Primary country *'),
                items: [
                  for (final code in operating)
                    DropdownMenuItem(
                        value: code, child: Text(_countryName(code))),
                ],
                onChanged: canEdit
                    ? (value) => setState(() => primary = value ?? primary)
                    : null,
              ),
              if (canEdit) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: saving ? null : _save,
                    icon: const Icon(Icons.save_outlined),
                    label: Text(saving ? 'Saving…' : 'Save configuration'),
                  ),
                ),
              ],
            ]),
          ),
          for (final code in operating)
            if (_definition(code) != null)
              SectionCard(
                title: '${_countryName(code)} workflow',
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(str(_definition(code)!['notice'])),
                      for (final stage
                          in (_definition(code)!['lifecycle'] as List? ??
                              const []))
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.check_circle_outline),
                          title: Text(str(stage)),
                        ),
                    ]),
              ),
        ],
      );

  Widget _cases() {
    const pageSize = 10;
    final rows = filteredCases;
    final totalPages = rows.isEmpty ? 1 : (rows.length / pageSize).ceil();
    if (page >= totalPages) page = totalPages - 1;
    final visible = rows.skip(page * pageSize).take(pageSize);
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
      children: [
        TextField(
          decoration: const InputDecoration(
              labelText: 'Search cases',
              prefixIcon: Icon(Icons.search),
              hintText: 'Candidate, country, status or employer'),
          onChanged: (value) => setState(() {
            search = value;
            page = 0;
          }),
        ),
        const SizedBox(height: 8),
        if (rows.isEmpty)
          const EmptyState('No work authorization cases found.',
              icon: Icons.badge_outlined)
        else
          for (final item in visible)
            Card(
              child: ListTile(
                title: Text(str(item['caseNumber'], 'Authorization case')),
                subtitle: Text(
                    '${personName(item['candidate'] as Map? ?? const {})} · ${_countryName(str(item['jurisdictionCode']))}'),
                trailing: StatusBadge(str(item['status'], 'DRAFT')),
              ),
            ),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('${rows.length} records · Page ${page + 1} of $totalPages'),
          Row(children: [
            IconButton(
                onPressed: page > 0 ? () => setState(() => page--) : null,
                icon: const Icon(Icons.chevron_left)),
            IconButton(
                onPressed:
                    page + 1 < totalPages ? () => setState(() => page++) : null,
                icon: const Icon(Icons.chevron_right)),
          ]),
        ]),
      ],
    );
  }
}
