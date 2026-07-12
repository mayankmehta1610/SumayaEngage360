import 'dart:convert';

import 'package:flutter/material.dart';
import 'common.dart';

/// Renders report API responses as KPI tiles and tables instead of raw JSON.
class ReportView extends StatelessWidget {
  final dynamic result;
  const ReportView(this.result, {super.key});

  @override
  Widget build(BuildContext context) {
    final data =
        result is Map && result['data'] != null ? result['data'] : result;
    if (data == null) return const EmptyState('No report data.');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (result is Map && result['generatedAt'] != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Generated ${result['generatedAt']}',
                style: TextStyle(
                    fontSize: 12, color: Theme.of(context).hintColor)),
          ),
        ..._widgetsFor(data),
      ],
    );
  }

  List<Widget> _widgetsFor(dynamic data) {
    if (data is! Map) {
      return [Text(data.toString())];
    }
    final out = <Widget>[];

    final kpis = data['kpis'];
    if (kpis is List && kpis.isNotEmpty) {
      out.add(Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final k in kpis)
            SizedBox(
              width: 140,
              child: KpiTile(str(k['value']), str(k['label'])),
            ),
        ],
      ));
      out.add(const SizedBox(height: 12));
    }

    for (final key in [
      'rows',
      'sources',
      'stages',
      'aging',
      'funnel',
      'byStatus',
      'byDepartment',
      'offersByStatus',
      'clearancesByStatus'
    ]) {
      final v = data[key];
      if (v is List && v.isNotEmpty) {
        out.add(_sectionTitle(_label(key)));
        out.add(_tableFromMaps(v));
        out.add(const SizedBox(height: 12));
      }
    }

    for (final entry in data.entries) {
      if ([
        'kpis',
        'rows',
        'sources',
        'stages',
        'aging',
        'funnel',
        'byStatus',
        'byDepartment',
        'offersByStatus',
        'clearancesByStatus'
      ].contains(entry.key)) {
        continue;
      }
      if (entry.value is num || entry.value is String || entry.value is bool) {
        out.add(ListTile(
          dense: true,
          title: Text(_label(entry.key)),
          trailing: Text(str(entry.value),
              style: const TextStyle(fontWeight: FontWeight.w600)),
        ));
      }
    }

    if (out.isEmpty) {
      out.add(SelectableText(
        const JsonEncoder.withIndent('  ').convert(data),
        style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
      ));
    }
    return out;
  }

  String _label(String key) => key
      .replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}')
      .replaceFirstMapped(RegExp(r'^\w'), (m) => m[0]!.toUpperCase())
      .trim();

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      );

  Widget _tableFromMaps(List rows) {
    if (rows.isEmpty) return const SizedBox.shrink();
    final first = rows.first;
    if (first is! Map) return Text(rows.toString());
    final cols = first.keys.map((k) => k.toString()).toList();
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columnSpacing: 16,
        headingRowHeight: 36,
        dataRowMinHeight: 32,
        columns: [
          for (final c in cols)
            DataColumn(
                label: Text(_label(c), style: const TextStyle(fontSize: 12)))
        ],
        rows: [
          for (final row in rows.take(50))
            if (row is Map)
              DataRow(cells: [
                for (final c in cols)
                  DataCell(
                      Text(str(row[c]), style: const TextStyle(fontSize: 12)))
              ]),
        ],
      ),
    );
  }
}
