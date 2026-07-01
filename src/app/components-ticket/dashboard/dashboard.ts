import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, DashboardResponse } from '../../services-ticket/ticket-service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  dashboard: DashboardResponse | null = null;
  cargando: boolean = true;
  error: string | null = null;

  @Output() verDetalle = new EventEmitter<any>();
  @Output() abrirChat = new EventEmitter<any>();
  @Output() toggleEstado = new EventEmitter<any>();
  @Output() asignarTicket = new EventEmitter<any>();

  constructor(
    private service: TicketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  get token(): string {
    return sessionStorage.getItem('token') || '';
  }

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.error = null;
    this.service.getDashboard(this.token).subscribe({
      next: (data: DashboardResponse) => {
        this.dashboard = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.error = (err?.status === 401 || err?.status === 403)
          ? 'Tu sesión expiró. Iniciá sesión nuevamente.'
          : 'No se pudo cargar el dashboard. Reintentá.';
        this.cdr.detectChanges();
      }
    });
  }

  get totalGrafico(): number {
    if (!this.dashboard) return 0;
    return this.dashboard.openTickets + this.dashboard.inProgressTickets + this.dashboard.resolvedTickets + this.dashboard.closedTickets;
  }

  get statusPercent(): (val: number) => number {
    const total = this.totalGrafico;
    return (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;
  }

  prioridadLabel(p: string): string {
    const map: any = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return map[p] || p;
  }

  estadoLabel(status: string): string {
    const map: any = { open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado' };
    return map[status] || status;
  }

  fechaLabel(f: string): string {
    if (!f) return '—';
    const d = new Date(f);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  avatarColor(nombre: string): string {
    const colors = ['#d946ef', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  inicialDe(nombre: string): string {
    return (nombre || '?').charAt(0).toUpperCase();
  }
}