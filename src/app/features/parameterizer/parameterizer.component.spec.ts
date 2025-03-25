import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParameterizerComponent } from './parameterizer.component';

describe('ParameterizerComponent', () => {
  let component: ParameterizerComponent;
  let fixture: ComponentFixture<ParameterizerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParameterizerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParameterizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
