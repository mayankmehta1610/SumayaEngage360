import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/theme.dart';

class KpiTile extends StatelessWidget {
  final String value;
  final String label;
  final Color? color;
  final VoidCallback? onTap;
  const KpiTile(this.value, this.label, {super.key, this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(value,
                  style: TextStyle(
                      fontSize: 24, fontWeight: FontWeight.w800, color: color ?? Theme.of(context).colorScheme.primary)),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
            ],
          ),
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String text;
  const StatusBadge(this.text, {super.key});

  Color _bg() {
    const good = ['APPROVED', 'ACTIVE', 'COMPLETED', 'DONE', 'PASSED', 'VERIFIED', 'RESOLVED', 'OPEN', 'PUBLISHED', 'CLEAR', 'HIRED'];
    const warn = ['PENDING', 'SUBMITTED', 'ON_NOTICE', 'IN_PROGRESS', 'UNDER_INVESTIGATION', 'SCREENING', 'INTERVIEW', 'ONBOARDING', 'DRAFT'];
    const bad = ['REJECTED', 'DISCARDED', 'FAILED', 'CANCELLED', 'DISMISSED', 'EXITED'];
    if (good.contains(text)) return E360Theme.success;
    if (warn.contains(text)) return E360Theme.warning;
    if (bad.contains(text)) return E360Theme.danger;
    return E360Theme.brand;
  }

  @override
  Widget build(BuildContext context) {
    final c = _bg();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: c.withValues(alpha: .14), borderRadius: BorderRadius.circular(99)),
      child: Text(text, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: c)),
    );
  }
}

class SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;
  const SectionCard({super.key, required this.title, required this.child, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700))),
              if (trailing != null) trailing!,
            ]),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final String message;
  final IconData? icon;
  const EmptyState(this.message, {super.key, this.icon});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
        child: Column(
          children: [
            if (icon != null) Icon(icon, size: 48, color: Theme.of(context).hintColor),
            if (icon != null) const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).hintColor, fontSize: 14)),
          ],
        ),
      );
}

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorState(this.message, {super.key, this.onRetry});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.error_outline, color: E360Theme.danger, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: E360Theme.danger)),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              FilledButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ],
        ),
      );
}

class RowTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  const RowTile({super.key, required this.title, this.subtitle, this.trailing, this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                if (subtitle != null)
                  Text(subtitle!, style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
              ]),
            ),
            if (trailing != null) trailing!,
          ]),
        ),
      );
}

class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({super.key});
  @override
  Widget build(BuildContext context) => const Center(child: CircularProgressIndicator());
}

void showError(BuildContext context, Object e) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(formatError(e)), backgroundColor: E360Theme.danger),
  );
}

String formatError(Object e) {
  if (e is ApiError) {
    if (e.status == 401) return 'Session expired — please sign in again.';
    if (e.status == 403) return 'You do not have permission for this action.';
    if (e.status >= 500) return 'Server error — try again later.';
    return e.message;
  }
  final s = e.toString();
  if (s.startsWith('Exception: ')) return s.substring(11);
  return s;
}

void showOk(BuildContext context, String msg) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: E360Theme.success),
  );
}

String str(dynamic v, [String fallback = '—']) => v == null ? fallback : v.toString();

String personName(dynamic user) {
  if (user is! Map) return str(user);
  return '${user['firstName'] ?? ''} ${user['lastName'] ?? ''}'.trim();
}

String employeeLabel(dynamic emp) {
  if (emp is! Map) return str(emp);
  final u = emp['user'];
  final name = personName(u);
  final code = emp['employeeCode'];
  return code != null ? '$name ($code)' : name;
}

List<dynamic> asList(dynamic data) {
  if (data is List) return data;
  if (data is Map && data['items'] is List) return data['items'] as List;
  if (data is Map && data['data'] is List) return data['data'] as List;
  return [];
}
