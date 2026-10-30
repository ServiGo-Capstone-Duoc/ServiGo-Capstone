import {
  Routes
} from '@angular/router';

import {
  authGuard
} from './core/guards/auth.guard';

import {
  guestGuard
} from './core/guards/guest.guard';

import {
  roleGuard
} from './core/guards/role.guard';


export const routes: Routes = [

  /*
   * =========================================
   * RAÍZ
   * =========================================
   */

  {
    path: '',

    redirectTo:
      'app/home',

    pathMatch:
      'full'
  },


  /*
   * =========================================
   * AUTENTICACIÓN
   * =========================================
   */

  {
    path:
      'login',

    canActivate: [
      guestGuard
    ],

    loadComponent: () =>
      import(
        './features/auth/login/login.page'
      )
        .then(
          m => m.LoginPage
        )
  },


  {
    path:
      'register',

    canActivate: [
      guestGuard
    ],

    loadComponent: () =>
      import(
        './features/auth/register/register.page'
      )
        .then(
          m => m.RegisterPage
        )
  },

/*
 * =========================================
 * RETORNO WEBPAY
 * =========================================
 *
 * Ruta externa al MainShell.
 *
 * Transbank retorna directamente aquí
 * después de completar o abandonar
 * el proceso de pago.
 */

{
  path:
    'payment/webpay-return',

  canActivate: [
    authGuard
  ],

  loadComponent: () =>
    import(
      './features/payment/webpay-return/webpay-return.page'
    )
      .then(
        m => m.WebpayReturnPage
      )
},
  /*
   * =========================================
   * APLICACIÓN AUTENTICADA
   * =========================================
   */

  {
    path:
      'app',

    canActivate: [
      authGuard
    ],

    loadComponent: () =>
      import(
        './features/main-shell/main-shell.page'
      )
        .then(
          m => m.MainShellPage
        ),

    children: [


      /*
       * -------------------------------------
       * REDIRECCIÓN INTERNA
       * -------------------------------------
       */

      {
        path: '',

        redirectTo:
          'home',

        pathMatch:
          'full'
      },


      /*
       * -------------------------------------
       * HOME CLIENTE
       * -------------------------------------
       */

      {
        path:
          'home',

        loadComponent: () =>
          import(
            './features/home/home.page'
          )
            .then(
              m => m.HomePage
            )
      },


      /*
       * -------------------------------------
       * SERVICIOS CLIENTE
       * -------------------------------------
       */

      {
        path:
          'services',

        loadComponent: () =>
          import(
            './features/services/services.page'
          )
            .then(
              m => m.ServicesPage
            )
      },


      /*
       * Nueva solicitud.
       *
       * Debe ir antes de :requestId
       * para que "new" no sea interpretado
       * como un identificador.
       */

      {
        path:
          'services/new',

        loadComponent: () =>
          import(
            './features/services/new-request/new-request.page'
          )
            .then(
              m => m.NewRequestPage
            )
      },


      /*
       * Detalle de presupuesto.
       */

      {
        path:
          'services/:requestId/quote/:quoteId',

        loadComponent: () =>
          import(
            './features/services/quote-detail/quote-detail.page'
          )
            .then(
              m => m.QuoteDetailPage
            )
      },


      /*
       * Detalle de solicitud cliente.
       */

      {
        path:
          'services/:requestId',

        loadComponent: () =>
          import(
            './features/services/service-detail/service-detail.page'
          )
            .then(
              m => m.ServiceDetailPage
            )
      },


      /*
       * -------------------------------------
       * MENSAJES - DETALLE
       * -------------------------------------
       *
       * Conversación asociada a un
       * serviceRequest concreto.
       *
       * Se deja antes de "messages"
       * por claridad de estructura.
       */

      {
        path:
          'messages/:requestId',

        loadComponent: () =>
          import(
            './features/messages/chat-detail/chat-detail.page'
          )
            .then(
              m => m.ChatDetailPage
            )
      },


      /*
       * -------------------------------------
       * MENSAJES - LISTADO
       * -------------------------------------
       */

      {
        path:
          'messages',

        loadComponent: () =>
          import(
            './features/messages/messages.page'
          )
            .then(
              m => m.MessagesPage
            )
      },


      /*
       * -------------------------------------
       * PERFIL
       * -------------------------------------
       */

      {
        path:
          'profile',

        loadComponent: () =>
          import(
            './features/profile/profile.page'
          )
            .then(
              m => m.ProfilePage
            )
      },


      /*
       * -------------------------------------
       * POSTULACIÓN TÉCNICA
       * -------------------------------------
       */

      {
        path:
          'technician/application',

        loadComponent: () =>
          import(
            './features/technician/application/application.page'
          )
            .then(
              m => m.ApplicationPage
            )
      },


      /*
       * -------------------------------------
       * HOME TÉCNICO
       * -------------------------------------
       */

      {
        path:
          'technician/home',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'tecnico'
          ]
        },

        loadComponent: () =>
          import(
            './features/technician/home/home.page'
          )
            .then(
              m => m.HomePage
            )
      },


      /*
       * -------------------------------------
       * TRABAJOS - DETALLE
       * -------------------------------------
       */

      {
        path:
          'technician/jobs/:requestId',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'tecnico'
          ]
        },

        loadComponent: () =>
          import(
            './features/technician/job-detail/job-detail.page'
          )
            .then(
              m => m.JobDetailPage
            )
      },


      /*
       * -------------------------------------
       * TRABAJOS - LISTADO
       * -------------------------------------
       */

      {
        path:
          'technician/jobs',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'tecnico'
          ]
        },

        loadComponent: () =>
          import(
            './features/technician/jobs/jobs.page'
          )
            .then(
              m => m.JobsPage
            )
      },


      /*
       * -------------------------------------
       * DETALLE DE OPORTUNIDAD
       * -------------------------------------
       */

      {
        path:
          'technician/opportunity/:requestId',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'tecnico'
          ]
        },

        loadComponent: () =>
          import(
            './features/technician/opportunity-detail/opportunity-detail.page'
          )
            .then(
              m => m.OpportunityDetailPage
            )
      },


      /*
       * -------------------------------------
       * COTIZACIÓN TÉCNICO
       * -------------------------------------
       */

      {
        path:
          'technician/quote/:requestId',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'tecnico'
          ]
        },

        loadComponent: () =>
          import(
            './features/technician/quote/quote.page'
          )
            .then(
              m => m.QuotePage
            )
      },


      /*
       * -------------------------------------
       * ADMINISTRACIÓN
       * -------------------------------------
       */

      {
        path:
          'admin',

        canActivate: [
          roleGuard
        ],

        data: {
          roles: [
            'administrador',
            'superadmin'
          ]
        },

        loadComponent: () =>
          import(
            './features/admin/admin.page'
          )
            .then(
              m => m.AdminPage
            )
      }
    ]
  },


  /*
   * =========================================
   * FALLBACK
   * =========================================
   *
   * SIEMPRE debe quedar al final.
   */

  {
    path:
      '**',

    redirectTo:
      'app/home'
  },
  {
    path: 'webpay-return',
    loadComponent: () => import('./features/payment/webpay-return/webpay-return.page').then( m => m.WebpayReturnPage)
  }
];