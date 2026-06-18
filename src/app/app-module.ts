import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Login } from './components-ticket/usuarios/login/login';
import { Registro } from './components-ticket/usuarios/registro/registro';
import { OlvideContrasenia } from './components-ticket/usuarios/olvide-contrasenia/olvide-contrasenia';
import { ResetContrasenia } from './components-ticket/usuarios/reset-contrasenia/reset-contrasenia';
import { Landing } from './components-ticket/landing/landing';
import { Dashboard } from './components-ticket/dashboard/dashboard';
import { AuthInterceptor } from './services-ticket/auth-interceptor';

@NgModule({
  declarations: [
    App,
    Landing,
    Login,
    Registro,
    OlvideContrasenia,
    ResetContrasenia,
    Dashboard
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    CommonModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule { }
