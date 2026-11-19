import {
  ThemeService
} from './theme.service';

describe(
  'ThemeService',
  () => {

    beforeEach(
      () => {
        localStorage.clear();
        document.documentElement
          .classList.remove(
            'ion-palette-dark'
          );
        delete document.documentElement
          .dataset['theme'];
      }
    );

    it(
      'aplica y persiste el modo oscuro',
      () => {
        const service =
          new ThemeService();

        service.initialize();
        service.setPreference(
          'dark'
        );

        expect(
          service.currentPreference
        ).toBe(
          'dark'
        );
        expect(
          service.currentTheme
        ).toBe(
          'dark'
        );
        expect(
          document.documentElement
            .classList.contains(
              'ion-palette-dark'
            )
        ).toBe(
          true
        );
        expect(
          document.documentElement
            .dataset['theme']
        ).toBe(
          'dark'
        );
        expect(
          localStorage.getItem(
            'servigo-theme-preference'
          )
        ).toBe(
          'dark'
        );
      }
    );

    it(
      'permite volver explícitamente al modo claro',
      () => {
        const service =
          new ThemeService();

        service.initialize();
        service.setPreference(
          'dark'
        );
        service.setPreference(
          'light'
        );

        expect(
          service.currentTheme
        ).toBe(
          'light'
        );
        expect(
          document.documentElement
            .classList.contains(
              'ion-palette-dark'
            )
        ).toBe(
          false
        );
        expect(
          document.documentElement
            .style.colorScheme
        ).toBe(
          'light'
        );
      }
    );

    it(
      'recupera una preferencia guardada en el dispositivo',
      () => {
        localStorage.setItem(
          'servigo-theme-preference',
          'dark'
        );

        const service =
          new ThemeService();

        service.initialize();

        expect(
          service.currentPreference
        ).toBe(
          'dark'
        );
        expect(
          service.currentTheme
        ).toBe(
          'dark'
        );
      }
    );
  }
);
