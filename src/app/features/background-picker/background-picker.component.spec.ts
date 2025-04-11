import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundPickerComponent } from './background-picker.component';

describe('BackgroundPickerComponent', () => {
  let component: BackgroundPickerComponent;
  let fixture: ComponentFixture<BackgroundPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackgroundPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackgroundPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
