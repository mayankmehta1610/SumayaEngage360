import 'package:flutter/material.dart';

/// Engage360 design system — matches web palette (navy sidebar, blue primary, indigo accent).
class E360Theme {
  static const Color primary = Color(0xFF3B82F6);
  static const Color primaryHover = Color(0xFF2563EB);
  static const Color accent = Color(0xFF6366F1);
  static const Color navy = Color(0xFF0F172A);
  static const Color navyBorder = Color(0xFF1E293B);
  static const Color surface0 = Color(0xFFF1F5F9);
  static const Color surface1 = Color(0xFFFFFFFF);
  static const Color surface2 = Color(0xFFF8FAFC);
  static const Color border = Color(0xFFE2E8F0);
  static const Color success = Color(0xFF15803D);
  static const Color warning = Color(0xFFB45309);
  static const Color danger = Color(0xFFB91C1C);
  static const Color info = Color(0xFF1D4ED8);

  /// Legacy alias used across mobile widgets.
  static const Color brand = primary;

  static ThemeData light() => _base(Brightness.light);
  static ThemeData dark() => _base(Brightness.dark);

  static ThemeData _base(Brightness b) {
    final isDark = b == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: accent,
      brightness: b,
      primary: primary,
      secondary: accent,
      surface: isDark ? const Color(0xFF141F38) : surface1,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: isDark ? const Color(0xFF0B1220) : surface0,
      drawerTheme: DrawerThemeData(
        backgroundColor: isDark ? navyBorder : navy,
        shape: const RoundedRectangleBorder(),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? navyBorder : navy,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: isDark ? const Color(0xFF141F38) : surface1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: isDark ? const Color(0xFF243354) : border),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: accent,
        foregroundColor: Colors.white,
        elevation: 2,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? const Color(0xFF1A2745) : surface1,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: isDark ? const Color(0xFF243354) : border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: isDark ? const Color(0xFF243354) : border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: isDark ? Colors.white : navy,
          side: BorderSide(color: isDark ? const Color(0xFF243354) : border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: isDark ? const Color(0xFF101B33) : surface1,
        indicatorColor: primary.withValues(alpha: .15),
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? Colors.white70 : navy),
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: primary, size: 24);
          }
          return IconThemeData(color: isDark ? Colors.white54 : const Color(0xFF64748B), size: 24);
        }),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: isDark ? const Color(0xFF1A2745) : surface2,
        side: BorderSide(color: isDark ? const Color(0xFF243354) : border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        labelStyle: TextStyle(fontSize: 12, color: isDark ? Colors.white : navy),
      ),
      listTileTheme: const ListTileThemeData(iconColor: Colors.white70),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dividerTheme: DividerThemeData(color: isDark ? const Color(0xFF243354) : border),
    );
  }
}
