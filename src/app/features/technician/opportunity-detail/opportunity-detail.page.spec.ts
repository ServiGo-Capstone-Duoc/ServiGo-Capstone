import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OpportunityDetailPage } from './opportunity-detail.page';

describe('OpportunityDetailPage', () => {
  let component: OpportunityDetailPage;
  let fixture: ComponentFixture<OpportunityDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(OpportunityDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
