import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components-ticket/home/home';
import { Login } from './components-ticket/usuarios/login/login';
import { Registro } from './components-ticket/usuarios/registro/registro';
import { OlvideContrasenia } from './components-ticket/usuarios/olvide-contrasenia/olvide-contrasenia';
import { TicketForm } from './components-ticket/ticket-form/ticket-form';

@NgModule({
  declarations: [
    App,
    Home,
    Login,
    Registro,
    OlvideContrasenia,
    TicketForm
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    CommonModule
  ],
  bootstrap: [App]
})
export class AppModule { }
