import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteDetailPage } from './quote-detail.page';

describe('QuoteDetailPage', () => {
  let component: QuoteDetailPage;
  let fixture: ComponentFixture<QuoteDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuoteDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
