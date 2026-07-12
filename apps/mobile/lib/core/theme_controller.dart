import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists manual light/dark preference; defaults to system on first launch.
class ThemeController extends ChangeNotifier {
  static const _storageKey = 'e360-theme';

  /// Set during app bootstrap so drawer/settings can toggle without prop drilling.
  static ThemeController? instance;

  ThemeMode _mode = ThemeMode.system;

  ThemeMode get mode => _mode;

  ThemeController() {
    instance = this;
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_storageKey);
    if (stored == 'light') {
      _mode = ThemeMode.light;
    } else if (stored == 'dark') {
      _mode = ThemeMode.dark;
    } else {
      _mode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> setMode(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    if (mode == ThemeMode.system) {
      await prefs.remove(_storageKey);
    } else {
      await prefs.setString(_storageKey, mode == ThemeMode.light ? 'light' : 'dark');
    }
  }

  Future<void> toggle(BuildContext context) async {
    final brightness = Theme.of(context).brightness;
    await setMode(brightness == Brightness.dark ? ThemeMode.light : ThemeMode.dark);
  }
}
