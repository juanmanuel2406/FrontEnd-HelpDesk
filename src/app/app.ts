import { Component, OnInit, ChangeDetectorRef, HostListener, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TicketService, TicketCreateDTO, TicketUpdateDTO } from './services-ticket/ticket-service';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  estaLogueado: boolean = false;
  sidebarActiva: string = 'dashboard';
  sidebarExpandida: boolean = false;
  usuario: string = '';
  mostrarDrawer: boolean = false;
  userData: any = null;
  rolUsuario: string = 'viewer';

  tickets: any[] = [];
  usuarios: any[] = [];
  areas: any[] = [];
  agentes: any[] = [];
  notificacion: { tipo: string; mensaje: string } | null = null;
  private timeoutId: any = null;

  createForm: any = { title: '', description: '', priority: 'medium' };
  editMode: boolean = false;
  editTicketId: number | null = null;
  tabTickets: string = 'enviados';
  mostrarFormCrear: boolean = false;
  imagenPerfilUrl: string | null = null;
  isDarkMode: boolean = true;

  ticketSeleccionado: any = null;
  ticketDetalle: any = null;
  detalleForm: any = { title: '', assignedToId: null, area: null };

  // Chat
  chatTicket: any = null;
  chatMessages: any[] = [];
  chatMessageText: string = '';
  chatCargando: boolean = false;
  chatSubiendoImagen: boolean = false;
  chatSelectedImage: File | null = null;
  chatImagePreviewUrl: any = null;
  private hubConnection: signalR.HubConnection | null = null;
  chatTypingUser: string | null = null;
  private typingTimeout: any = null;
  private typingSendTimer: any = null;
  private lastTypingSent: number = 0;
  private chatPollingTimer: any = null;

  // NLP Chatbot
  chatNlpActivo: boolean = false;
  chatNlpEscalado: boolean = false;
  chatFilterActivo: 'bot' | 'human' = 'bot';

  // Notifications removed per user request

  constructor(
    public cdr: ChangeDetectorRef,
    private router: Router,
    private service: TicketService,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {}

  get esLanding(): boolean {
    return this.router.url === '/';
  }

  get esAdmin(): boolean {
    return this.rolUsuario === 'admin';
  }

  get esAgent(): boolean {
    return this.rolUsuario === 'agent';
  }

  get esViewer(): boolean {
    return this.rolUsuario === 'viewer';
  }

  get puedeCrearEditarBorrar(): boolean {
    return this.esAdmin || this.esAgent;
  }

  get puedeAsignarTicket(): boolean {
    return this.esAdmin || this.esAgent;
  }

  get inicialUsuario(): string {
    return this.usuario ? this.usuario.charAt(0).toUpperCase() : '?';
  }

  get token(): string {
    return sessionStorage.getItem('token') || '';
  }

  get ticketsVisibles(): any[] {
    return this.tickets.filter((t: any) => !t.isDeleted).map((t: any) => ({ ...t, progress: t.progress ?? 0 }));
  }

  get ticketsEnviados(): any[] {
    if (!this.userData) return [];
    return this.ticketsVisibles.filter((t: any) => t.createdById === this.userData.userId);
  }

  get ticketsRecibidos(): any[] {
    if (!this.userData) return [];
    const userId = this.userData.userId;
    return this.ticketsVisibles.filter((t: any) => t.assignedToId === userId);
  }

  get totalEnviados(): number {
    return this.ticketsEnviados.length;
  }

  get completados(): number {
    return this.ticketsEnviados.filter((t: any) => t.status === 'closed').length;
  }

  get progreso(): number {
    if (this.totalEnviados === 0) return 0;
    return Math.round((this.completados / this.totalEnviados) * 100);
  }

  get ticketDetail(): any {
    return this.ticketSeleccionado;
  }

  get agentesFiltrados(): any[] {
    const areaSel = this.detalleForm?.area;
    return this.agentes.filter(u => {
      const role = (u.role || '').toLowerCase();
      if (role === 'viewer') return false;
      if (role === 'admin') return true;
      if (!areaSel) return true;
      const userArea = u.area ?? u.Area ?? u.areaId ?? u.AreaId;
      return userArea != null && userArea == areaSel;
    });
  }

  ngOnInit(): void {
    this.isDarkMode = true;
    this.verificarSesion();
    this.iniciarChequeoRol();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.verificarSesion());
  }

  private mapearRol(role: any): string {
    if (role === 'user') return 'viewer';
    const map: Record<string, string> = { '1': 'admin', '2': 'viewer', '3': 'agent' };
    const mapped = map[String(role)];
    if (mapped) return mapped;
    return (role || 'viewer').toString().toLowerCase();
  }

  private verificarSesion(): void {
    this.estaLogueado = sessionStorage.getItem('logueado') === 'true';
    if (this.estaLogueado) {
      this.usuario = sessionStorage.getItem('usuario') || '';
      const raw = sessionStorage.getItem('userData');
      this.userData = raw ? JSON.parse(raw) : null;
      this.rolUsuario = this.mapearRol(this.userData?.role);
      this.imagenPerfilUrl = localStorage.getItem('avatar_' + this.usuario);
      // Restore per-user theme
      const savedTheme = localStorage.getItem('isDarkMode_' + this.usuario);
      if (savedTheme !== null) this.isDarkMode = savedTheme === 'true';
      else this.isDarkMode = true;
      this.cargarTickets();
      this.cargarAreas();
    }
    this.cdr.detectChanges();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.usuario) {
      localStorage.setItem('isDarkMode_' + this.usuario, String(this.isDarkMode));
    }
    this.cdr.detectChanges();
  }

  // === SIDE DRAWER ===
  toggleDrawer(event: Event): void {
    event.stopPropagation();
    this.mostrarDrawer = !this.mostrarDrawer;
    this.cdr.detectChanges();
  }

  cerrarDrawer(): void {
    this.mostrarDrawer = false;
    this.cdr.detectChanges();
  }

  toggleSidebar(event: Event): void {
    event.stopPropagation();
    this.sidebarExpandida = !this.sidebarExpandida;
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarDrawer();
    this.cerrarChat();
  }

  // === TICKETS ===
  actualizarTickets(): void {
    this.cargarTickets();
  }

  cargarTickets(): void {
    if (!this.token) return;
    this.service.getTickets(this.token).subscribe({
      next: (data: any) => {
        this.tickets = data || [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  // === NOTIFICACIONES ===
  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.notificacion = null;
      this.cdr.detectChanges();
    }, 5000);
    this.cdr.detectChanges();
  }

  // === TICKET FORM ===
  resetForm(): void {
    this.createForm = { title: '', description: '', priority: 'medium', area: null };
    this.editMode = false;
    this.editTicketId = null;
    this.ticketSeleccionado = null;
    this.mostrarFormCrear = false;
  }

  crearTicket(): void {
    if (!this.createForm.title || !this.createForm.description) {
      this.mostrarNotificacion('danger', 'Completá todos los campos obligatorios.');
      return;
    }
    const dto: any = {
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      priority: this.createForm.priority
    };
    if (this.createForm.area) dto.area = Number(this.createForm.area);

    this.service.createTicket(dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', res.mensaje || 'Ticket creado correctamente.');
          this.resetForm();
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al crear el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  iniciarEdicion(ticket: any): void {
    this.cargarAreas();
    this.createForm = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      area: ticket.area ?? ticket.Area ?? null
    };
    this.editMode = true;
    this.editTicketId = ticket.id;
    this.ticketSeleccionado = ticket;
    this.mostrarFormCrear = false;
    this.sidebarActiva = 'crear-ticket';
    this.cdr.detectChanges();
  }

  guardarEdicion(): void {
    if (!this.editTicketId) return;
    const dto: TicketUpdateDTO = {
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      priority: this.createForm.priority
    };
    this.service.updateTicket(this.editTicketId, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', res.mensaje || 'Ticket actualizado correctamente.');
          this.resetForm();
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  eliminarTicket(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este ticket?')) return;
    this.service.softDeleteTicket(id, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.tickets = this.tickets.filter((t: any) => t.id !== id);
          this.mostrarNotificacion('success', res.mensaje || 'Ticket eliminado correctamente.');
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al eliminar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  toggleEstado(ticket: any): void {
    const nuevoStatus = ticket.status === 'closed' ? 'open' : 'closed';
    const dto: TicketUpdateDTO = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: nuevoStatus
    };
    this.service.updateTicket(ticket.id, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          ticket.status = nuevoStatus;
          this.mostrarNotificacion('success', nuevoStatus === 'closed' ? 'Ticket completado.' : 'Ticket reabierto.');
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el estado.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  asignarTicket(ticket: any): void {
    if (!this.userData) return;
    const dto: TicketUpdateDTO = {
      assignedToId: this.userData.userId
    };
    this.service.updateTicket(ticket.id, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          ticket.assignedToId = this.userData.userId;
          this.mostrarNotificacion('success', 'Ticket #' + ticket.id + ' asignado correctamente.');
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al asignar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  puedeAsignarTicketBtn(ticket: any): boolean {
    if (!this.userData || this.esViewer) return false;
    if (ticket.assignedToId) return false;
    return true;
  }

  verDetalle(ticket: any): void {
    this.ticketSeleccionado = ticket;
    this.sidebarActiva = 'detalle-ticket';
    this.cdr.detectChanges();
  }

  // === TICKET DETAIL VIEW ===
  verDetalleTicket(ticket: any): void {
    this.sidebarActiva = 'detalle-ticket';
    this.ticketDetalle = null;
    this.detalleForm = { title: '', assignedToId: null, area: null, solution: '' };
    this.cargarAreas();
    this.cargarAgentes();
    this.service.getTicketDetail(ticket.id || ticket.Id, this.token).subscribe({
      next: (data: any) => {
        this.ticketDetalle = data;
        this.detalleForm.title = data.title || data.Title || '';
        this.detalleForm.assignedToId = data.assignedToId ?? data.AssignedToId ?? null;
        this.detalleForm.area = data.area ?? data.Area ?? null;
        this.detalleForm.solution = data.solution || data.Solution || '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarNotificacion('danger', 'Error al cargar el detalle del ticket.');
        this.sidebarActiva = 'tus-tickets';
        this.cdr.detectChanges();
      }
    });
    this.cerrarDrawer();
    this.cdr.detectChanges();
  }

  onAreaChange(): void {
    const areaSel = this.detalleForm?.area;
    if (areaSel && this.detalleForm?.assignedToId) {
      const asignadoValido = this.agentesFiltrados.some(a => {
        const id = a.userId || a.UserId || a.id || a.Id;
        return id == this.detalleForm.assignedToId;
      });
      if (!asignadoValido) {
        this.detalleForm.assignedToId = null;
      }
    }
  }

  guardarDetalleTicket(): void {
    if (!this.ticketDetalle) return;
    const id = this.ticketDetalle.id || this.ticketDetalle.Id;
    const dto: any = {};
    if (this.detalleForm.title?.trim()) dto.title = this.detalleForm.title.trim();
    if (this.detalleForm.assignedToId !== null && this.detalleForm.assignedToId !== undefined) dto.assignedToId = this.detalleForm.assignedToId;
    else dto.assignedToId = null;
    if (this.detalleForm.area !== null && this.detalleForm.area !== undefined) dto.area = this.detalleForm.area;
    else dto.area = null;
    if (this.detalleForm.solution?.trim()) dto.solution = this.detalleForm.solution.trim();
    if (!dto.title) {
      this.mostrarNotificacion('danger', 'El título no puede estar vacío.');
      return;
    }
    this.service.updateTicket(id, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado !== false) {
          this.mostrarNotificacion('success', 'Ticket actualizado correctamente.');
          this.cerrarDetalleTicket();
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el ticket.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al actualizar el ticket.';
        this.mostrarNotificacion('danger', msg);
        this.cdr.detectChanges();
      }
    });
  }

  cerrarDetalleTicket(): void {
    this.ticketDetalle = null;
    this.detalleForm = { title: '', assignedToId: null, area: null };
    this.sidebarActiva = 'tus-tickets';
    this.cdr.detectChanges();
  }

  // === AREAS & AGENTS ===
  private cargarAreas(): void {
    // Try cached areas first (frontend-only persistence)
    const cached = localStorage.getItem('cachedAreas');
    if (cached) {
      try { this.areas = JSON.parse(cached); } catch {}
    }
    // Refresh from API in background
    if (!this.token) return;
    this.service.getAreas(this.token).subscribe({
      next: (data: any) => {
        this.areas = Array.isArray(data) ? data : [];
        localStorage.setItem('cachedAreas', JSON.stringify(this.areas));
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  private cargarAgentes(): void {
    if (!this.token) return;
    this.service.getUsers(this.token).subscribe({
      next: (data: any) => {
        this.agentes = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  // === NOTIFICATIONS ===
  // === USER MANAGEMENT (admin) ===
  cargarUsuarios(): void {
    if (!this.token) return;
    this.cargarAreas();
    this.service.getUsers(this.token).subscribe({
      next: (data: any) => {
        this.usuarios = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  cambiarRolUsuario(user: any, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nuevoRol = select.value;
    const anterior = user.role || user.Role;
    if (!confirm(`¿Cambiar el rol de ${user.username || user.Username} a "${nuevoRol}"?`)) {
      select.value = anterior;
      return;
    }
    this.service.updateUserRole(user.userId || user.UserId, nuevoRol, this.token).subscribe({
      next: (res: any) => {
        if (res.estado !== false) {
          this.cargarUsuarios();
          this.mostrarNotificacion('success', `Rol de ${user.username || user.Username} actualizado a "${nuevoRol}"`);
        } else {
          select.value = anterior;
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el rol.');
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        select.value = anterior;
        const msg = err.error?.mensaje || err.error?.title || 'Error al actualizar el rol.';
        this.mostrarNotificacion('danger', msg);
        this.cdr.detectChanges();
      }
    });
  }

  cambiarAreaUsuario(user: any, event: Event): void {
    try {
      const select = event.target as HTMLSelectElement;
      const nuevoAreaId = select.value === '' ? null : Number(select.value);
      const userId = user.userId || user.UserId;
      const areaAnterior = user.areaId ?? user.AreaId ?? user.area ?? user.Area ?? null;
      const areaFind = nuevoAreaId != null ? this.areas.find(a => (a.id || a.Id) === nuevoAreaId) : null;
      this.service.updateUserArea(userId, nuevoAreaId, this.token).subscribe({
        next: (res: any) => {
          try {
            if (res.estado !== false) {
              user.areaId = nuevoAreaId;
              user.AreaId = nuevoAreaId;
              user.area = areaFind ? (areaFind.area_Name || areaFind.Area_Name || areaFind.name || areaFind.Name) : null;
              user.Area = user.area;
              this.cargarUsuarios();
              this.mostrarNotificacion('success', `Área de ${user.username || user.Username} actualizada.`);
            } else {
              select.value = areaAnterior == null ? '' : String(areaAnterior);
              this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el área.');
            }
          } catch (e) {
            this.mostrarNotificacion('danger', 'Error al procesar la respuesta.');
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          try {
            select.value = areaAnterior == null ? '' : String(areaAnterior);
            const msg = err.error?.mensaje || err.error?.title || 'Error al actualizar el área.';
            this.mostrarNotificacion('danger', msg);
          } catch (e) {
            this.mostrarNotificacion('danger', 'Error al actualizar el área.');
          }
          this.cdr.detectChanges();
        }
      });
    } catch (e) {
      this.mostrarNotificacion('danger', 'Error al cambiar el área.');
      this.cdr.detectChanges();
    }
  }

  // === ROLE CHANGE MONITOR ===
  private intervalRol: any = null;

  private iniciarChequeoRol(): void {
    this.detenerChequeoRol();
    this.intervalRol = setInterval(() => this.chequearRol(), 60000);
  }

  private detenerChequeoRol(): void {
    if (this.intervalRol) {
      clearInterval(this.intervalRol);
      this.intervalRol = null;
    }
  }

  private chequearRol(): void {
    if (!this.token || !this.userData) return;
    this.service.getUsers(this.token).subscribe({
      next: (data: any) => {
        const users = Array.isArray(data) ? data : [];
        const yo = users.find((u: any) => (u.userId || u.UserId) === this.userData?.userId);
        if (yo) {
          const nuevoRol = this.mapearRol(yo.role || yo.Role);
          if (nuevoRol !== this.rolUsuario) {
            this.rolUsuario = nuevoRol;
            this.userData.role = yo.role || yo.Role;
            sessionStorage.setItem('userData', JSON.stringify(this.userData));
            this.mostrarNotificacion('info', `Tu rol ha sido cambiado a "${nuevoRol}".`);
            this.cdr.detectChanges();
          }
        }
      },
      error: () => {}
    });
  }

  // === PROGRESS ===
  esCoordinador(ticket: any): boolean {
    return this.esAdmin || (ticket.assignedToUsername === this.usuario);
  }

  onProgresoChange(ticket: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const nuevoProgreso = parseInt(input.value, 10);
    if (nuevoProgreso === 100 && ticket.status !== 'closed') {
      const prev = ticket.progress || 0;
      if (confirm('¿Quieres dar por finalizado el ticket?')) {
        this.actualizarProgreso(ticket, 100, true);
      } else {
        input.value = prev.toString();
      }
    } else {
      this.actualizarProgreso(ticket, nuevoProgreso, false);
    }
  }

  private actualizarProgreso(ticket: any, progreso: number, cerrar: boolean): void {
    const dto: any = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority
    };
    ticket.progress = progreso;
    if (cerrar) dto.status = 'closed';
    this.service.updateTicket(ticket.id, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado !== false) {
          if (cerrar) {
            ticket.status = 'closed';
            this.mostrarNotificacion('success', 'Ticket finalizado correctamente.');
          }
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al actualizar.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  // === CHAT ===
  abrirChat(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.chatTicket = ticket;
    this.chatMessages = [];
    this.chatMessageText = '';
    this.chatCargando = true;
    this.chatNlpActivo = false;
    this.chatNlpEscalado = false;
    this.chatFilterActivo = this.rolUsuario === 'viewer' ? 'bot' : 'human';
    this.chatSubiendoImagen = false;
    this.chatSelectedImage = null;
    this.chatImagePreviewUrl = null;
    this.chatTypingUser = null;
    this.cdr.detectChanges();
    const ticketId = ticket.id || ticket.Id;
    this.conectarHub(ticketId);
    this.cargarMensajes(ticketId);
    setTimeout(() => {
      if (this.chatCargando) {
        this.chatCargando = false;
        this.cdr.detectChanges();
      }
    }, 10000);
    this.iniciarPollingChat(ticketId);
  }

  get chatMessagesFiltrados(): any[] {
    if (this.chatFilterActivo === 'bot') {
      return this.chatMessages.filter(m => m.userUsername === 'soporteit-bot');
    }
    return this.chatMessages.filter(m => m.userUsername !== 'soporteit-bot');
  }

  cerrarChat(): void {
    this.detenerPollingChat();
    this.desconectarHub();
    this.chatTicket = null;
    this.chatMessages = [];
    this.chatMessageText = '';
    this.chatCargando = false;
    this.chatTypingUser = null;
    this.chatNlpActivo = false;
    this.chatNlpEscalado = false;
    this.chatFilterActivo = 'bot';
    this.removerImagenSeleccionada();
    this.cdr.detectChanges();
  }

  private conectarHub(ticketId: number): void {
    this.desconectarHub();
    const apiBase = environment.apiUrl.replace('/api/v1', '');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBase}/hubs/chat?access_token=${this.token}`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveMessage', (msg: any) => {
      this.ngZone.run(() => {
        if (!this.chatMessages.find(m => m.id === msg.id)) {
          this.chatMessages = [...this.chatMessages, msg];
          if (msg.userUsername === 'soporteit-bot' && msg.content?.includes('Redirigiendo a un agente')) {
            this.chatNlpActivo = false;
            this.chatNlpEscalado = true;
          }
          this.cdr.detectChanges();
          setTimeout(() => this.scrollChatAlFinal(), 100);
        }
      });
    });

    this.hubConnection.on('UserTyping', (data: any) => {
      this.ngZone.run(() => {
        if (data.userId !== this.userData?.userId) {
          this.chatTypingUser = data.username;
          this.cdr.detectChanges();
          if (this.typingTimeout) clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            this.chatTypingUser = null;
            this.cdr.detectChanges();
          }, 3000);
        }
      });
    });

    this.hubConnection.onreconnected(() => {
      if (this.chatTicket) {
        this.cargarMensajes(this.chatTicket.id || this.chatTicket.Id);
        this.hubConnection?.invoke('JoinTicketGroup', this.chatTicket.id || this.chatTicket.Id).catch(() => {});
      }
    });

    this.hubConnection.start()
      .then(() => {
        this.chatNlpActivo = this.rolUsuario === 'viewer';
        return this.hubConnection!.invoke('JoinTicketGroup', ticketId);
      })
      .catch(err => {
        console.error('[chat] SignalR error:', err);
        this.mostrarNotificacion('danger', 'Error de conexión con el chat en tiempo real. Usando actualización periódica.');
      });
  }

  private desconectarHub(): void {
    if (this.hubConnection) {
      const ticketId = this.chatTicket?.id || this.chatTicket?.Id;
      if (ticketId) {
        this.hubConnection.invoke('LeaveTicketGroup', ticketId).catch(() => {});
      }
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    if (this.typingSendTimer) {
      clearTimeout(this.typingSendTimer);
      this.typingSendTimer = null;
    }
    this.lastTypingSent = 0;
    this.chatTypingUser = null;
  }

  cargarMensajes(ticketId: number): void {
    if (!this.token) {
      this.chatCargando = false;
      this.cdr.detectChanges();
      return;
    }
    this.service.getTicketMessages(ticketId, this.token).subscribe({
      next: (data: any) => {
        const nuevos = Array.isArray(data) ? data : (data?.messages || []);
        for (const msg of nuevos) {
          if (!this.chatMessages.find(m => m.id === msg.id)) {
            this.chatMessages = [...this.chatMessages, msg];
          }
        }
        this.chatCargando = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollChatAlFinal(), 100);
      },
      error: () => {
        this.chatCargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private iniciarPollingChat(ticketId: number): void {
    this.detenerPollingChat();
    this.chatPollingTimer = setInterval(() => {
      this.cargarMensajes(ticketId);
    }, 5000);
  }

  private detenerPollingChat(): void {
    if (this.chatPollingTimer) {
      clearInterval(this.chatPollingTimer);
      this.chatPollingTimer = null;
    }
  }

  enviarMensaje(): void {
    const texto = this.chatMessageText?.trim();
    if ((!texto && !this.chatSelectedImage) || !this.chatTicket) return;
    this.chatSubiendoImagen = !!this.chatSelectedImage;
    this.cdr.detectChanges();

    const done = () => {
      this.chatMessageText = '';
      this.removerImagenSeleccionada();
      this.chatSubiendoImagen = false;
      this.cdr.detectChanges();
      setTimeout(() => this.scrollChatAlFinal(), 200);
    };
    const fail = (msg: string) => {
      this.mostrarNotificacion('danger', msg);
      this.chatSubiendoImagen = false;
      this.cdr.detectChanges();
    };

    if (this.chatNlpActivo && this.esViewer && !this.chatSelectedImage && texto && this.hubConnection) {
      this.hubConnection.invoke('SendNlpMessage', this.chatTicket.id, texto)
        .then(() => done())
        .catch(() => fail('Error al enviar.'));
      return;
    }

    if (!this.chatSelectedImage) {
      this.service.sendTicketMessage(this.chatTicket.id, texto!, this.token).subscribe({
        next: () => done(),
        error: () => fail('Error al enviar.')
      });
      return;
    }

    this.service.uploadTicketImage(this.chatTicket.id, this.chatSelectedImage, this.token).subscribe({
      next: (res: any) => {
        const imageUrl = res ? (typeof res === 'string' ? res : res?.imageUrl || '') : null;
        const apiBase = environment.apiUrl.replace('/api/v1', '');
        const fullImageUrl = imageUrl ? apiBase + imageUrl : null;
        if (!fullImageUrl) { fail('Error al obtener la URL.'); return; }

        this.service.sendTicketMessage(this.chatTicket.id, fullImageUrl, this.token).subscribe({
          next: () => {
            if (texto) {
              this.service.sendTicketMessage(this.chatTicket.id, texto, this.token).subscribe({
                next: () => done(),
                error: () => fail('Error al enviar.')
              });
            } else {
              done();
            }
          },
          error: () => fail('Error al enviar.')
        });
      },
      error: () => fail('Error al subir la imagen.')
    });
  }

  esMensajePropio(msg: any): boolean {
    return msg.userId === this.userData?.userId;
  }

  triggerImageSelect(): void {
    const el = document.getElementById('chatFileInput') as HTMLInputElement;
    if (el) el.click();
  }

  // === IMAGEN EN CHAT ===
  onImageSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input?.files?.length) return;
    const fl = input.files[0];
    if (!fl.type.startsWith('image/') || fl.size > 10485760) {
      this.mostrarNotificacion('danger', fl.type.startsWith('image/') ? 'La imagen no puede superar los 10 MB.' : 'Solo se permiten imágenes.');
      return;
    }
    this.chatSelectedImage = fl;
    this.chatImagePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(fl));
    try { (input as any).value = ''; } catch {}
  }

  removerImagenSeleccionada(): void {
    try { URL.revokeObjectURL(this.chatImagePreviewUrl as any); } catch {}
    this.chatSelectedImage = null;
    this.chatImagePreviewUrl = null;
  }

  onChatInput(): void {
    this.cdr.detectChanges();
    if (!this.hubConnection || !this.chatTicket) return;
    const now = Date.now();
    if (this.chatMessageText.trim()) {
      if (now - this.lastTypingSent > 2000) {
        this.lastTypingSent = now;
        this.hubConnection.invoke('NotifyTyping', this.chatTicket.id || this.chatTicket.Id).catch(() => {});
      }
      if (this.typingSendTimer) clearTimeout(this.typingSendTimer);
      this.typingSendTimer = setTimeout(() => {
        this.lastTypingSent = 0;
      }, 3000);
    }
  }

  // === LINKS E IMAGENES EN MENSAJES ===
  formatearMensaje(content: string): SafeHtml {
    if (!content) return '';
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // Fix old image URLs pointing to port 5066
    const apiBaseUrl = environment.apiUrl.replace('/api/v1', '');
    const oldPort = apiBaseUrl.includes('5067') ? ':5066' : '';
    if (oldPort) {
      const portPattern = new RegExp(oldPort.replace(':', '\\:'), 'g');
      html = html.replace(portPattern, ':5067');
    }
    const urlPattern = /(https?:\/\/[^\s<]+)/gi;
    html = html.replace(urlPattern, (url) => {
      if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) {
        return `<img src="${url}" class="chat-img" alt="Imagen" />`;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
    });
    return this.sanitizer.bypassSecurityTrustHtml(html.replace(/\n/g, '<br>'));
  }

  private scrollChatAlFinal(): void {
    try {
      const el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // === REFRESCO ===
  cambiarTabTickets(tab: string): void {
    this.tabTickets = tab;
    this.cargarTickets();
    this.cdr.detectChanges();
  }

  // === LABELS ===
  estadoLabel(status: string): string {
    const map: any = { open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado' };
    return map[status] || status;
  }

  prioridadLabel(p: string): string {
    const map: any = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return map[p] || p;
  }

  fechaLabel(f: string): string {
    if (!f) return '—';
    const d = new Date(f);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // === AVATAR COLOR ===
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

  nombreCreador(ticket: any): string {
    return ticket.createdBy?.fullname || ticket.createdBy?.username || ticket.createdByFullname || ticket.createdByUsername || '—';
  }

  nombreAsignado(ticket: any): string {
    return ticket.assignedTo?.fullname || ticket.assignedTo?.username || ticket.assignedToFullname || ticket.assignedToUsername || '';
  }

  // === AVATAR FILE ===
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenPerfilUrl = e.target.result;
        if (this.usuario) {
          localStorage.setItem('avatar_' + this.usuario, e.target.result);
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // === SESION ===
  cerrarSesion(): void {
    this.estaLogueado = false;
    this.sidebarActiva = 'dashboard';
    this.mostrarDrawer = false;
    this.tickets = [];
    this.ticketSeleccionado = null;
    this.detenerChequeoRol();
    this.cerrarChat();
    sessionStorage.removeItem('logueado');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('token');
    this.imagenPerfilUrl = null;
    this.router.navigate(['/login']);
    this.cdr.detectChanges();
  }

  scrollA(id: string): void {
    if (!this.esLanding) {
      this.router.navigate(['/']);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }

  seleccionarOpcion(opcion: string): void {
    this.sidebarActiva = opcion;
    if (opcion === 'tus-tickets') {
      this.tabTickets = 'enviados';
      this.cargarTickets();
    } else if (opcion === 'crear-ticket') {
      this.editMode = false;
      this.resetForm();
      this.cargarAreas();
    } else if (opcion === 'dashboard') {
    } else if (opcion === 'usuarios') {
      this.cargarUsuarios();
    }
    this.cerrarDrawer();
    this.cdr.detectChanges();
  }
}
