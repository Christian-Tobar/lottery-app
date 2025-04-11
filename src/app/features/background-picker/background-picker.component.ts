import { NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MATERIAL_COMPONENTS } from '../../core/material.components';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-background-picker',
  standalone: true,
  imports: [MATERIAL_COMPONENTS, NgStyle, NgFor, NgIf],
  templateUrl: './background-picker.component.html',
  styleUrl: './background-picker.component.scss',
})
export class BackgroundPickerComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<BackgroundPickerComponent>);

  backgroundImages = ['assets/images/bg1.jpg', 'assets/images/bg2.jpg'];

  backgroundColors = [
    '#ffffff',
    '#f8f9fa',
    '#e0e0e0',
    '#fdd835',
    '#c8e6c9',
    '#b3e5fc',
  ];

  selectBackground(value: string) {
    this.bottomSheetRef.dismiss(value);
  }
}
