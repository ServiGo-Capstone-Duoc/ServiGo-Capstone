import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';


export type ServiGoMode =
  | 'cliente'
  | 'tecnico';


@Injectable({
  providedIn: 'root'
})
export class AppModeService {

  private readonly storageKey =
    'servigo-active-mode';


  private readonly modeSubject =
    new BehaviorSubject<ServiGoMode>(
      this.loadInitialMode()
    );


  readonly mode$:
    Observable<ServiGoMode> =
      this.modeSubject.asObservable();


  get currentMode():
    ServiGoMode {

    return this.modeSubject.value;
  }


  setMode(
    mode: ServiGoMode
  ): void {

    this.modeSubject.next(
      mode
    );


    try {

      localStorage.setItem(
        this.storageKey,
        mode
      );

    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible guardar el modo:',
        error
      );
    }
  }


  resetToClient():
    void {

    this.setMode(
      'cliente'
    );
  }


  private loadInitialMode():
    ServiGoMode {

    try {

      const stored =
        localStorage.getItem(
          this.storageKey
        );


      if (
        stored === 'tecnico'
      ) {

        return 'tecnico';
      }

    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible recuperar el modo:',
        error
      );
    }


    return 'cliente';
  }
}