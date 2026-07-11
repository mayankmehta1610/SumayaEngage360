import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() => runApp(const Engage360App());

class Engage360App extends StatelessWidget {
  const Engage360App({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Engage360',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A56DB)), useMaterial3: true),
      home: const LoginScreen(),
    );
  }
}

class Api {
  static const base = String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:3000/api');
  static String? token;
  static String? tenant;

  static Map<String, String> headers() => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
    if (tenant != null) 'x-tenant-id': tenant!,
  };

  static Future<dynamic> get(String path) async {
    final r = await http.get(Uri.parse('$base$path'), headers: headers());
    return jsonDecode(r.body);
  }

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final r = await http.post(Uri.parse('$base$path'), headers: headers(), body: jsonEncode(body ?? {}));
    return jsonDecode(r.body);
  }

  static Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    final r = await http.patch(Uri.parse('$base$path'), headers: headers(), body: jsonEncode(body ?? {}));
    return jsonDecode(r.body);
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final tenant = TextEditingController(text: 'acme');
  String? error;

  Future<void> login() async {
    Api.tenant = tenant.text.trim();
    try {
      final res = await Api.post('/auth/login', {'email': email.text, 'password': password.text});
      Api.token = res['accessToken'];
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (e) {
      setState(() => error = 'Login failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Engage360 ESS')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(children: [
          TextField(controller: tenant, decoration: const InputDecoration(labelText: 'Tenant')),
          TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
          if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          FilledButton(onPressed: login, child: const Text('Sign in')),
        ]),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;
  dynamic kpis;
  List approvals = [];
  List leaves = [];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    kpis = await Api.get('/dashboard/kpis');
    approvals = await Api.get('/approvals/pending') as List? ?? [];
    setState(() {});
  }

  Future<void> punch() async {
    await Api.post('/attendance/punch', {'type': 'IN', 'source': 'MOBILE'});
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Checked in')));
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['Home', 'Approvals', 'Leave'];
    return Scaffold(
      appBar: AppBar(title: Text(tabs[tab])),
      body: tab == 0
          ? ListView(padding: const EdgeInsets.all(16), children: [
              Card(child: ListTile(
                title: const Text('Check in'),
                subtitle: Text('Pending approvals: ${approvals.length}'),
                trailing: FilledButton(onPressed: punch, child: const Text('Punch IN')),
              )),
              if (kpis != null) Card(child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Leave balance: ${kpis['personal']?['leaveBalance'] ?? '—'}'),
              )),
            ])
          : tab == 1
              ? ListView(children: [
                  for (final a in approvals)
                    ListTile(title: Text(a['entityType'] ?? 'Approval'), subtitle: Text(a['status'] ?? '')),
                ])
              : const Center(child: Text('Use web for leave requests')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.approval), label: 'Approvals'),
          NavigationDestination(icon: Icon(Icons.event), label: 'Leave'),
        ],
      ),
    );
  }
}
