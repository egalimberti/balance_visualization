import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CookieService } from 'ngx-cookie-service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ViewGraphComponent } from './pages/view-graph/view-graph.component';
import { ViewGraphGeneratorService } from './pages/view-graph/view-graph-generator.service';
import { ViewGraphRenderingService } from './pages/view-graph/view-graph-rendering.service';

@NgModule({
  declarations: [
    AppComponent,
    ViewGraphComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgxSpinnerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [ViewGraphGeneratorService, ViewGraphRenderingService, CookieService],
  bootstrap: [AppComponent]
})
export class AppModule { }
