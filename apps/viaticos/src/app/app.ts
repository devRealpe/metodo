
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CacheDetectionService } from '@microfrontends/shared-services';

@Component({
  imports: [RouterModule,],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected title = 'Viaticos';
  
  constructor(
    private cacheDetection: CacheDetectionService // ✅ Detecta restauración desde cache
  ) {
    
  }
  
  ngOnInit(): void {
    // ✅ CRÍTICO: Inicializar detección de cache (resuelve problema de botón atrás)
    this.cacheDetection.initialize();
    
  }
}
