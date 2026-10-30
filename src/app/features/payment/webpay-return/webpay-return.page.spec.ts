import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WebpayReturnPage } from './webpay-return.page';

describe('WebpayReturnPage', () => {
  let component: WebpayReturnPage;
  let fixture: ComponentFixture<WebpayReturnPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WebpayReturnPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
