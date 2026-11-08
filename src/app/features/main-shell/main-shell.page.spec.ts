import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainShellPage } from './main-shell.page';

describe('MainShellPage', () => {
  let component: MainShellPage;
  let fixture: ComponentFixture<MainShellPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MainShellPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
