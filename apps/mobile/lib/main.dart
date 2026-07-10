import 'package:flutter/material.dart';

void main() {
  runApp(const Engage360App());
}

class Engage360App extends StatelessWidget {
  const Engage360App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Engage360',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A56DB)),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            'SumayaEngage360\nEmployee self-service — scaffold',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
