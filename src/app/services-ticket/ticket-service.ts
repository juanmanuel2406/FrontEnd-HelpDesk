import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketService {

  constructor(private http: HttpClient) { }

  private urlUser = environment.apiUrl + '/User/'
  private urlTicket = environment.apiUrl + '/Ticket/'
  private urlTeam = environment.apiUrl + '/Team/'
  private urlHistory = environment.apiUrl + '/TicketHistory/'
  private urlAgent = environment.apiUrl + '/Agent/'
  private urlInvite = environment.apiUrl + '/Invitation/'

  private headers(token: string): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) };
  }

  // === AUTH ===
  Login(obj: any) {
    return this.http.post(this.urlUser + "login", obj)
  }

  RegistrarUsuario(obj: any) {
    return this.http.post(this.urlUser + "register", obj)
  }

  // === USERS / AGENTS ===
  getUsers(token: string) {
    return this.http.get(this.urlUser, this.headers(token))
  }

  updateUserRole(userId: number, role: string, token: string) {
    return this.http.patch(this.urlUser + userId + '/role', { role }, this.headers(token))
  }

  updateUserAvailability(userId: number, availability: string, token: string) {
    return this.http.patch(this.urlUser + userId + '/availability', { availability }, this.headers(token))
  }

  // === TEAMS ===
  getTeams(token: string) {
    return this.http.get(this.urlTeam, this.headers(token))
  }

  createTeam(dto: any, token: string) {
    return this.http.post(this.urlTeam, dto, this.headers(token))
  }

  getTeamMembers(teamId: number, token: string) {
    return this.http.get(this.urlTeam + teamId + '/members', this.headers(token))
  }

  addTeamMember(teamId: number, userId: number, token: string) {
    return this.http.post(this.urlTeam + teamId + '/members', { userId }, this.headers(token))
  }

  removeTeamMember(teamId: number, userId: number, token: string) {
    return this.http.delete(this.urlTeam + teamId + '/members/' + userId, this.headers(token))
  }

  // === INVITATIONS ===
  inviteAgent(email: string, token: string) {
    return this.http.post(this.urlInvite, { email }, this.headers(token))
  }

  resendInvitation(email: string, token: string) {
    return this.http.post(this.urlInvite + 'resend', { email }, this.headers(token))
  }

  getMyPendingInvitation(token: string) {
    return this.http.get(this.urlInvite + 'pending', this.headers(token))
  }

  respondInvitation(invitationId: number, accept: boolean, token: string) {
    return this.http.patch(this.urlInvite + invitationId + '/respond', { accept }, this.headers(token))
  }

  // === USER TEAMS ===
  getUserTeams(userId: number, token: string) {
    return this.http.get(this.urlUser + userId + '/teams', this.headers(token))
  }

  // === TICKETS ===
  getTickets(token: string) {
    return this.http.get(this.urlTicket, this.headers(token))
  }

  getTicketById(id: number, token: string) {
    return this.http.get(this.urlTicket + id, this.headers(token))
  }

  createTicket(dto: any, token: string) {
    return this.http.post(this.urlTicket, dto, this.headers(token))
  }

  updateTicket(id: number, dto: any, token: string) {
    return this.http.put(this.urlTicket + id, dto, this.headers(token))
  }

  deleteTicket(id: number, token: string) {
    return this.http.delete(this.urlTicket + id, this.headers(token))
  }

  assignTicket(ticketId: number, userId: number, token: string) {
    return this.http.patch(this.urlTicket + ticketId + '/assign', { assignedToId: userId }, this.headers(token))
  }

  // === TICKET HISTORY ===
  getTicketHistory(ticketId: number, token: string) {
    return this.http.get(this.urlHistory + ticketId, this.headers(token))
  }
}
