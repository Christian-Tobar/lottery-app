import { Routes } from '@angular/router';
import { SeriesDetailComponent } from './features/series-detail/series-detail.component';
import { ParameterizerComponent } from './features/parameterizer/parameterizer.component';
import { SeriesListComponent } from './features/series-list/series-list.component';

export const routes: Routes = [
  { path: '', component: ParameterizerComponent },
  { path: 'series', component: SeriesListComponent },
  { path: 'series/:id', component: SeriesDetailComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
