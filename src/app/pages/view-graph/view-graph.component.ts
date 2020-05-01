import { Component, HostListener } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { ViewGraphGeneratorService } from './view-graph-generator.service';
import { ViewGraphRenderingService } from './view-graph-rendering.service';
import { DTYPE, OVERLAP_REMOVAL } from '../../commons/consts';
import { GraphResponse } from '../../commons/models/graph-response';
import { GraphRequest, GraphRenderingConfig } from 'src/app/commons/models';
import { saveAs } from 'file-saver';
import * as svgAsPng from 'save-svg-as-png';
import * as utils from '../../commons/utils';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    templateUrl: './view-graph.component.html',
    styleUrls: ['./view-graph.component.scss']
})
export class ViewGraphComponent {

    public readonly overlapRemovalModes = OVERLAP_REMOVAL;
    private readonly maxWidth = 1400;
    public useServerGenerator = false;
    public dtypes = DTYPE;
    public showForm = true;
    public inputFile: File;
    public error = {
        hasError: false,
        errorMessage: ''
    };

    public config: GraphRenderingConfig = {
        darkMode: false,
        decimalPrecision: 10,
        dtype: DTYPE.NONE,
        width: Math.min(this.maxWidth, window.innerWidth - 100),
        height: window.innerHeight - 60,
        overlapRemovalMode: OVERLAP_REMOVAL.NONE,
        svgDomId: 'svg',
        highlight: true,
        edgesDynamicOpacity: true,
        showUnbalancement: false,
        showZoom: false,
        showAxesTicks: false
    };

    /* BACKUP */
    public latestResponse: GraphResponse;

    @HostListener('window:resize')
    onResize(): void {
        this.config.width = Math.min(this.maxWidth, window.innerWidth - 100);
        this.config.height = window.innerHeight - 60;
        if (!!this.latestResponse) {
            this.graphRenderingService.showGraph(this.latestResponse, this.config);
        }
    }

    @HostListener('window:keydown', ['$event'])
    public handleKeyDown(event: KeyboardEvent) {

        if (!!event.key && event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.displayButtonClick();
        }
    }

    public constructor(
        protected graphGeneratorService: ViewGraphGeneratorService,
        protected graphRenderingService: ViewGraphRenderingService,
        protected cookieService: CookieService
    ) {
        const cookieData = this.cookieService.get('config');
        if (!!cookieData) {
            this.config = JSON.parse(cookieData);
        }
    }

    public setFile(event: Event): void {
        if (!!event && !!event.target) {
            this.inputFile = (event.target as HTMLInputElement).files[0];
        }
    }

    public displayButtonClick(): void {
        if (!!this.inputFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const request: GraphRequest = {
                    dType: this.config.dtype,
                    graph: event.target.result.toString()
                };
                const renderGraph = (response: GraphResponse) => {
                    this.error = {
                        hasError: false,
                        errorMessage: undefined
                    };
                    this.latestResponse = response;
                    this.graphRenderingService.showGraph(this.latestResponse, this.config);
                };

                this.cookieService.set('config', JSON.stringify(this.config));

                const handleError = (errorMsg: string) => {
                    console.error(errorMsg);
                    this.error.errorMessage = errorMsg;
                    this.error.hasError = true;
                };

                if (this.useServerGenerator) {
                    this.graphGeneratorService.callServiceGenerateGraph(request).subscribe((response: GraphResponse) => {
                        if (!!response) {
                            renderGraph(response);
                        } else {
                            handleError('Received empty data from Server');
                        }
                    }, (error: HttpErrorResponse) => {
                        let errorMsg: string;
                        switch (error.status) {
                            case 504:
                                errorMsg = 'Unreachable server';
                                break;
                            default:
                                errorMsg = JSON.stringify(error);
                                break;
                        }
                        handleError(errorMsg);
                    });
                } else {
                    renderGraph(this.graphGeneratorService.processGraphRequest(request, this.config.decimalPrecision));
                }
            };
            reader.readAsText(this.inputFile);
        }
        this.showForm = false;
    }

    public toggleMenu() {
        this.showForm = !this.showForm;
    }

    public exportButtonClick(): void {
        try {
            svgAsPng.svgAsPngUri(document.getElementById(`rendered-${this.config.svgDomId}`), {}, (uri: string) => {
                saveAs(utils.dataURItoBlob(uri), `${this.config.svgDomId}.png`);
            });
        } catch (error) {
            console.warn('Cannot save as png; possibly missing svg?');
        }
    }

}
