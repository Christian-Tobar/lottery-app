import { Routes } from '@angular/router';
import { SeriesDetailComponent } from './features/series-detail/series-detail.component';
import { ParameterizerComponent } from './features/parameterizer/parameterizer.component';
import { SeriesListComponent } from './features/series-list/series-list.component';
import { ValidatorComponent } from './features/validator/validator.component';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  { path: '', component: ParameterizerComponent, canActivate: [authGuard] },
  { path: 'series', component: SeriesListComponent, canActivate: [authGuard] },
  {
    path: 'series/:id',
    component: SeriesDetailComponent,
    canActivate: [authGuard],
  },
  { path: 'validar', component: ValidatorComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
