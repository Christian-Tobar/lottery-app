import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ContextService {
  selectedSeriesId: string = '';
  selectedSeriesCurrentStatus: string = '';
  viewSeriesArchive: boolean = false;

  constructor() {}
}
