import {
  Injectable
} from '@angular/core';

import {
  Capacitor
} from '@capacitor/core';

import {
  StatusBar,
  Style
} from '@capacitor/status-bar';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';

import {
  ResolvedTheme,
  ThemePreference
} from '../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly storageKey =
    'servigo-theme-preference';

  private readonly mediaQuery =
    typeof window !== 'undefined'
      ? window.matchMedia(
        '(prefers-color-scheme: dark)'
      )
      : null;

  private readonly preferenceSubject =
    new BehaviorSubject<ThemePreference>(
      this.loadPreference()
    );

  private readonly resolvedThemeSubject =
    new BehaviorSubject<ResolvedTheme>(
      this.resolveTheme(
        this.preferenceSubject.value
      )
    );

  readonly preference$:
    Observable<ThemePreference> =
      this.preferenceSubject.asObservable();

  readonly resolvedTheme$:
    Observable<ResolvedTheme> =
      this.resolvedThemeSubject.asObservable();

  private initialized = false;

  private readonly onSystemThemeChange =
    (): void => {

      if (
        this.preferenceSubject.value !==
        'system'
      ) {
        return;
      }

      this.applyResolvedTheme(
        this.resolveTheme('system')
      );
    };

  initialize(): void {

    if (
      this.initialized
    ) {
      return;
    }

    this.initialized = true;

    this.mediaQuery
      ?.addEventListener(
        'change',
        this.onSystemThemeChange
      );

    this.applyResolvedTheme(
      this.resolveTheme(
        this.preferenceSubject.value
      )
    );
  }

  get currentPreference():
    ThemePreference {

    return this.preferenceSubject.value;
  }

  get currentTheme():
    ResolvedTheme {

    return this.resolvedThemeSubject.value;
  }

  setPreference(
    preference: ThemePreference
  ): void {

    this.preferenceSubject.next(
      preference
    );

    try {

      localStorage.setItem(
        this.storageKey,
        preference
      );

    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible guardar el tema:',
        error
      );
    }

    this.applyResolvedTheme(
      this.resolveTheme(
        preference
      )
    );
  }

  private loadPreference():
    ThemePreference {

    try {

      const stored =
        localStorage.getItem(
          this.storageKey
        );

      if (
        stored === 'light'
        || stored === 'dark'
        || stored === 'system'
      ) {
        return stored;
      }

    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible recuperar el tema:',
        error
      );
    }

    return 'system';
  }

  private resolveTheme(
    preference: ThemePreference
  ): ResolvedTheme {

    if (
      preference === 'light'
      || preference === 'dark'
    ) {
      return preference;
    }

    return this.mediaQuery?.matches
      ? 'dark'
      : 'light';
  }

  private applyResolvedTheme(
    theme: ResolvedTheme
  ): void {

    this.resolvedThemeSubject.next(
      theme
    );

    if (
      typeof document === 'undefined'
    ) {
      return;
    }

    const root =
      document.documentElement;

    root.dataset['theme'] =
      theme;

    root.classList.toggle(
      'ion-palette-dark',
      theme === 'dark'
    );

    root.style.colorScheme =
      theme;

    this.updateThemeMeta(
      theme
    );

    void this.updateNativeStatusBar(
      theme
    );
  }

  private updateThemeMeta(
    theme: ResolvedTheme
  ): void {

    const themeColor =
      theme === 'dark'
        ? '#0b1220'
        : '#f5f7fb';

    let meta =
      document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]'
      );

    if (
      !meta
    ) {

      meta =
        document.createElement(
          'meta'
        );

      meta.name =
        'theme-color';

      document.head.appendChild(
        meta
      );
    }

    meta.content =
      themeColor;
  }

  private async updateNativeStatusBar(
    theme: ResolvedTheme
  ): Promise<void> {

    if (
      !Capacitor.isNativePlatform()
    ) {
      return;
    }

    try {

      await StatusBar.setStyle({
        style:
          theme === 'dark'
            ? Style.Light
            : Style.Dark
      });

      await StatusBar.setBackgroundColor({
        color:
          theme === 'dark'
            ? '#0b1220'
            : '#f5f7fb'
      });

    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible actualizar la barra de estado:',
        error
      );
    }
  }
}
