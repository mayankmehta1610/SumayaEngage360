import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/auth_service.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../shell/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final tenant = TextEditingController(text: ApiClient.tenant ?? 'sumaya');
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;

  Future<void> _submit() async {
    setState(() => busy = true);
    try {
      await AuthService.login(tenant.text, email.text.trim(), password.text);
      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [E360Theme.navy, E360Theme.navyBorder, E360Theme.surface0],
            stops: [0, 0.42, 0.42],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [E360Theme.primary, E360Theme.accent],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: E360Theme.primary.withValues(alpha: .35),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.dashboard_outlined, color: Colors.white, size: 28),
                      ),
                      const SizedBox(height: 18),
                      const Text('SumayaEngage360',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: E360Theme.navy)),
                      Text('Sign in to your enterprise workspace',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Theme.of(context).hintColor, fontSize: 14)),
                      const SizedBox(height: 28),
                      TextField(
                        controller: tenant,
                        decoration: const InputDecoration(
                          labelText: 'Company code (tenant)',
                          hintText: 'sumaya',
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: password,
                        obscureText: true,
                        onSubmitted: (_) => _submit(),
                        decoration: const InputDecoration(labelText: 'Password'),
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: busy ? null : _submit,
                        icon: busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.login, size: 18),
                        label: Text(busy ? 'Signing in…' : 'Sign in'),
                      ),
                      const SizedBox(height: 16),
                      Text('API: ${ApiClient.base}',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 10, color: Theme.of(context).hintColor)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
