import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceDetailPage } from './service-detail.page';

describe('ServiceDetailPage', () => {
  let component: ServiceDetailPage;
  let fixture: ComponentFixture<ServiceDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
