import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment.dev';

fetch('/assets/env.json')
  .then((response) => response.json())
  .then((env) => {
    environment.firebaseConfig = {
      apiKey: env.API_KEY,
      authDomain: env.AUTH_DOMAIN,
      projectId: env.PROJECT_ID,
      storageBucket: env.STORAGE_BUCKET,
      messagingSenderId: env.MESSAGING_SENDER_ID,
      appId: env.APP_ID,
    };

    return bootstrapApplication(AppComponent, appConfig);
  })
  .catch((err) =>
    console.error('Error cargando el archivo de configuración:', err)
  );
