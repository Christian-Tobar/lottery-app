import { Routes } from '@angular/router';
import { SeriesDetailComponent } from './features/series-detail/series-detail.component';
import { ParameterizerComponent } from './features/parameterizer/parameterizer.component';
import { SeriesListComponent } from './features/series-list/series-list.component';
import { ValidatorComponent } from './features/validator/validator.component';

export const routes: Routes = [
  { path: '', component: ParameterizerComponent },
  { path: 'series', component: SeriesListComponent },
  { path: 'series/:id', component: SeriesDetailComponent },
  { path: 'validar', component: ValidatorComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
