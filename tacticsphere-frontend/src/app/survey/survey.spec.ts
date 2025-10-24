import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SurveyComponent } from './survey';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('SurveyComponent', () => {
  let component: SurveyComponent;
  let fixture: ComponentFixture<SurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create SurveyComponent', () => {
    expect(component).toBeTruthy();
  });
});