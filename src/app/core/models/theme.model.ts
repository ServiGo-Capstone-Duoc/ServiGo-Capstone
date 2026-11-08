export type ThemePreference =
  | 'system'
  | 'light'
  | 'dark';

export type ResolvedTheme =
  | 'light'
  | 'dark';

export interface ThemeOption {
  value: ThemePreference;
  label: string;
  description: string;
  icon: string;
}
