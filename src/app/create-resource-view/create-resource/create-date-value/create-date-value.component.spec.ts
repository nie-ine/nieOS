import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDateValueComponent } from './create-date-value.component';

describe('CreateDateValueComponent', () => {
  let component: CreateDateValueComponent;
  let fixture: ComponentFixture<CreateDateValueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateDateValueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateDateValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});