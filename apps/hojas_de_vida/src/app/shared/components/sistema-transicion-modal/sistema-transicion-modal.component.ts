import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sistema-transicion-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sistema-transicion-modal.component.html',
  styleUrls: ['./sistema-transicion-modal.component.scss']
})
export class SistemaTransicionModalComponent implements OnInit {
  showModal = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const modalVisto = sessionStorage.getItem('transicionModalVisto');
    
    if (!modalVisto) {
      setTimeout(() => {
        this.showModal = true;
      }, 300);
    }
  }

  irSistemaAntiguo(): void {
    sessionStorage.setItem('transicionModalVisto', 'true');
    window.location.href = 'http://serviap2010.umariana.edu.co/HojaVida/ppal.jsp';
  }

  continuarSistemaNuevo(): void {
    sessionStorage.setItem('transicionModalVisto', 'true');
    this.showModal = false;
  }

  closeModal(): void {
    this.showModal = false;
  }
}
