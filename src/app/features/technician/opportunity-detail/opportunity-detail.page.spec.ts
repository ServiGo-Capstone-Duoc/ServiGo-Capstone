import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpportunityDetailPage } from './opportunity-detail.page';

describe('OpportunityDetailPage', () => {
  let component: OpportunityDetailPage;
  let fixture: ComponentFixture<OpportunityDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OpportunityDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
