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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 72, height: 72, alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: E360Theme.brand, borderRadius: BorderRadius.circular(20)),
                  child: const Text('S3', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(height: 18),
                const Text('SumayaEngage360', textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                Text('Enterprise HR — every role, on the go',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).hintColor)),
                const SizedBox(height: 28),
                TextField(controller: tenant,
                    decoration: const InputDecoration(labelText: 'Company code (tenant)', hintText: 'sumaya')),
                const SizedBox(height: 12),
                TextField(controller: email, keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(controller: password, obscureText: true,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(labelText: 'Password')),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: busy ? null : _submit,
                  child: Text(busy ? 'Signing in…' : 'Sign in'),
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
    );
  }
}
