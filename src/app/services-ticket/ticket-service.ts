import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginDTO {
  username: string;
  password: string;
}

export interface RegisterDTO {
  username: string;
  password: string;
  email: string;
  fullname: string;
  areaId?: number | null;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  token: string;
  newPassword: string;
}

export interface TicketCreateDTO {
  title: string;
  description: string;
  priority?: string | null;
}

export interface TicketUpdateDTO {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assignedToId?: number | null;
}

export interface GeneralResponse {
  estado: boolean;
  codigo: number;
  mensaje: string;
}

export interface LoginResponse extends GeneralResponse {
  token: string;
  userId: number;
  username: string;
  fullname: string;
  email: string;
  role: string;
  active: number;
}

export interface TicketCreateResponse extends GeneralResponse {
  ticketId: number;
}

export interface TicketInboxResponse {
  id: number;
  title: string;
  status: string;
  priority: string;
  createdById: number;
  createdByUsername: string;
  createdByFullname: string;
  assignedToId: number | null;
  assignedToUsername: string | null;
  assignedToFullname: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface TicketDetailResponse {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdById: number;
  createdByUsername: string;
  createdByFullname: string;
  createdByEmail: string;
  assignedToId: number | null;
  assignedToUsername: string | null;
  assignedToFullname: string | null;
  assignedToEmail: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DashboardResponse {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  lowPriority: number;
  mediumPriority: number;
  highPriority: number;
  ticketsCreatedByMe: number;
  ticketsAssignedToMe: number;
  recentTickets: TicketInboxResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class TicketService {

  constructor(private http: HttpClient) { }

  private urlAuth = environment.apiUrl + '/Auth/';
  private urlTicket = environment.apiUrl + '/Ticket/';
  private urlDashboard = environment.apiUrl + '/Dashboard/';

  private headers(token: string): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) };
  }

  // === AUTH (public) ===

  Login(dto: LoginDTO): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.urlAuth + 'login', dto);
  }

  Register(dto: RegisterDTO): Observable<GeneralResponse> {
    return this.http.post<GeneralResponse>(this.urlAuth + 'register', dto);
  }

  ConfirmEmail(userId: number, token: string): Observable<GeneralResponse> {
    return this.http.get<GeneralResponse>(this.urlAuth + 'confirm-email', {
      params: { userId, token }
    });
  }

  ForgotPassword(dto: ForgotPasswordDTO): Observable<GeneralResponse> {
    return this.http.post<GeneralResponse>(this.urlAuth + 'forgot-password', dto);
  }

  ResetPassword(dto: ResetPasswordDTO): Observable<GeneralResponse> {
    return this.http.post<GeneralResponse>(this.urlAuth + 'reset-password', dto);
  }

  // === TICKETS (auth required) ===

  getTickets(token: string): Observable<any[]> {
    return this.http.get<any[]>(this.urlTicket, this.headers(token));
  }

  getTicketInbox(token: string): Observable<TicketInboxResponse[]> {
    return this.http.get<TicketInboxResponse[]>(this.urlTicket + 'inbox', this.headers(token));
  }

  getTicketById(id: number, token: string): Observable<any> {
    return this.http.get<any>(this.urlTicket + id, this.headers(token));
  }

  getTicketDetail(id: number, token: string): Observable<TicketDetailResponse> {
    return this.http.get<TicketDetailResponse>(this.urlTicket + id + '/detail', this.headers(token));
  }

  createTicket(dto: TicketCreateDTO, token: string): Observable<TicketCreateResponse> {
    return this.http.post<TicketCreateResponse>(this.urlTicket, dto, this.headers(token));
  }

  updateTicket(id: number, dto: TicketUpdateDTO, token: string): Observable<GeneralResponse> {
    return this.http.put<GeneralResponse>(this.urlTicket + id, dto, this.headers(token));
  }

  softDeleteTicket(id: number, token: string): Observable<GeneralResponse> {
    return this.http.delete<GeneralResponse>(this.urlTicket + id, this.headers(token));
  }

  hardDeleteTicket(id: number, token: string): Observable<GeneralResponse> {
    return this.http.delete<GeneralResponse>(this.urlTicket + id + '/hard', this.headers(token));
  }

  // === DASHBOARD (auth required) ===

  getDashboard(token: string): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(this.urlDashboard, this.headers(token));
  }
}
