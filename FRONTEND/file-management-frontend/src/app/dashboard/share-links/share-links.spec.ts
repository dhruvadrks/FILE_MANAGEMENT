import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareLinks } from './share-links';

describe('ShareLinks', () => {
  let component: ShareLinks;
  let fixture: ComponentFixture<ShareLinks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareLinks],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareLinks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
