import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/* COMPONENTS */
import { ViewGraphComponent } from '../app/pages/view-graph/view-graph.component';

/* SERVICES */
import { ViewGraphGeneratorService } from './pages/view-graph/view-graph-generator.service';
import { ViewGraphRenderingService } from './pages/view-graph/view-graph-rendering.service';

const routes: Routes = [
  {
    path: '**',
    component: ViewGraphComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [ViewGraphGeneratorService, ViewGraphRenderingService]
})
export class AppRoutingModule { }
