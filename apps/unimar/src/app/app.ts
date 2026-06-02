import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CacheDetectionService } from '@microfrontends/shared-services';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'unimar';

  constructor(private cacheDetection: CacheDetectionService) {}

  ngOnInit(): void {
    this.cacheDetection.initialize();
  }
}
