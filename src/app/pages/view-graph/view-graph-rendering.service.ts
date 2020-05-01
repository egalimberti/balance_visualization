import {
    GraphResponse,
    Node,
    BinningNode,
    KeyValueNode,
    Edge,
    SignType,
    GraphRenderingData,
    GraphRenderingConfig,
    D3SvgElement
} from '../../commons/models';
import { OVERLAP_REMOVAL, HEX_COLORS, STROKE_THICKNESS, STROKE_OPACITY, NODES_OPACITY } from '../../commons/consts';
import { Injectable } from '@angular/core';
import { NgxSpinnerService } from "ngx-spinner";
import * as d3 from 'd3';

export type EdgeSelection = d3.Selection<SVGPathElement, Edge, SVGSVGElement, unknown>;
export type NodeSelection = d3.Selection<SVGCircleElement, KeyValueNode, SVGSVGElement, unknown>;

@Injectable({
    providedIn: 'root'
})
export class ViewGraphRenderingService {

    private renderingData: GraphRenderingData;
    private svg: D3SvgElement;
    private config: GraphRenderingConfig;

    constructor(private spinner: NgxSpinnerService) { }

    /**
     * Function to show graph using d3 library
     * @param data data retuned from service (i.e. graph data)
     * @param showZoom whether to enable zoom option
     * @param height svg desired height
     * @param width svg desired width
     * @param svgDomId svg DOM id with default value (just use to render more graphs at the same time)
     */
    public async showGraph(
        data: GraphResponse,
        config: GraphRenderingConfig
    ): Promise<void> {
        this.spinner.show().then(() => {
            setTimeout(() => {
                this.renderer(data, config).then(() => {
                    this.spinner.hide();
                });
            }, 1000)
        });
    }

    private async renderer(data: GraphResponse,
        config: GraphRenderingConfig): Promise<void> {
        /* INIT */
        this.renderingData = this.initRenderingData(data, config.width, config.height);
        this.svg = this.resetAndGenerateSvg(config.svgDomId, config.width, config.height, config.showZoom);
        this.config = config;
        /* EO INIT */

        /* PRINTING */
        this.scaleCoordinatesOnSvgSize(this.renderingData);

        if (config.overlapRemovalMode === OVERLAP_REMOVAL.BINNING) {
            this.binningMode(this.renderingData);
        }

        if (!config.showZoom) {
            this.printAxes(this.svg, this.renderingData);
            if (!!config.showAxesTicks) {
                this.printAxesTicks(this.svg, this.renderingData);
            }
        }

        const interEdgeSvg: EdgeSelection = this.printInterEdges(this.svg, this.renderingData, this.config.edgesDynamicOpacity, this.config.showUnbalancement);
        const intraEdgeSvg: EdgeSelection = this.printIntraEdges(this.svg, this.renderingData, config.edgesDynamicOpacity, config.showUnbalancement);
        const nodeSvg: NodeSelection = this.printNodes(this.svg, this.renderingData, config.overlapRemovalMode);

        /* EO PRINTING */

        /* RENDERING OPTIMIZATIONS */
        if (!!config.showZoom) {
            this.enableZoom(this.svg, this.renderingData, nodeSvg, interEdgeSvg, intraEdgeSvg, config.overlapRemovalMode);
        }

        if (!!config.highlight) {
            this.highlight(nodeSvg, interEdgeSvg, intraEdgeSvg, this.renderingData, config.edgesDynamicOpacity, config.showUnbalancement);
        }
        /* EO RENDERING OPTIMIZATIONS */
    }

    /**
     * Clean the page from other svg objects
     * @param svgDomId id of the DOM Element containing the SVG
     * @param width svg desired width
     * @param height svg desired height
     * @param zoom indicates whether the zoom is active or not
     */
    private resetAndGenerateSvg(svgDomId: string, width?: number, height?: number, zoom?: boolean): D3SvgElement {
        d3.select(`#${svgDomId}`).selectAll('*').remove();

        if (!!width && !!height) {
            // draw a new svg object
            return d3.select(`#${svgDomId}`).append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('id', `rendered-${svgDomId}`)
                .style('overflow', zoom ? 'hidden' : 'visible');
        }
    }

    /***************************************************/
    /*************** PRIVATE FUNCTIONS *****************/
    /***************************************************/

    /**
     * Enable zoom to improve nodes' visibility
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     * @param nodeSvg printed nodes
     * @param interEdgeSvg printed inter edges
     * @param intraEdgeSvg printed intra edges
     * @param overlapRemovalMode indicates how nodes' radius is
     */
    private enableZoom(svg: D3SvgElement, renderingData: GraphRenderingData, nodeSvg: NodeSelection, interEdgeSvg: EdgeSelection, intraEdgeSvg: EdgeSelection, overlapRemovalMode: OVERLAP_REMOVAL): void {
        const getXAxisTranslatePos = (scaleFunction: Function) => {
            let newPos;
            /*if (renderingData.eigenValue === 0) {
                newPos = renderingData.limitDimensions.midHeight * 4 / 3;
            }
            else {*/
            newPos = scaleFunction(renderingData.dTypeCoefficient !== 0 || renderingData.eigenValue === 0 ? 0 :
                renderingData.eigenValue + (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient);
            //}
            if (newPos < 0) {
                return 0;
            } else if (newPos >= renderingData.limitDimensions.height - 20) {
                return renderingData.limitDimensions.height - 20;
            }
            return newPos;
        }
        const getYAxisTranslatePos = (scaleFunction: Function) => {
            const newPos = scaleFunction(0);
            if (newPos <= 35) {
                return 35;
            } else if (newPos >= renderingData.limitDimensions.width - 3) {
                return renderingData.limitDimensions.width - 3;
            }
            return newPos;
        }

        // scale nodes' coordinates on desired graph size
        let zoomScaleX = d3.scaleLinear()
            .domain([-1.2, 1.2])
            .range([0, renderingData.limitDimensions.width]);

        let zoomScaleY;
        if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
            zoomScaleY = d3.scaleLinear()
                .domain([-1, 1])
                .range([renderingData.limitDimensions.height, 0]);
            /*for (let i = 0; i < Object.values(renderingData.nodes).length; i++) {
                renderingData.nodes[i].x = zoomScaleX(renderingData.nodes[i].x);
                renderingData.nodes[i].y = zoomScaleY(renderingData.nodes[i].y);
            }*/
        } else {
            zoomScaleY = d3.scaleLinear()
                .domain([-renderingData.limitCoordinates.maxY, renderingData.limitCoordinates.maxY])
                .range([renderingData.limitDimensions.midHeight * 8 / 3, 0]);
            /*for (let i = 0; i < Object.values(renderingData.nodes).length; i++) {
                renderingData.nodes[i].x = zoomScaleX(renderingData.nodes[i].x);
                renderingData.nodes[i].y = zoomScaleY(renderingData.nodes[i].y - 1 + renderingData.eigenValue);
            }*/
        }

        // add X axis
        let xAxis = svg.append('g')
            .attr('transform', 'translate(' + 0 + ',' + getXAxisTranslatePos(renderingData.scaleLinearY) + ')')
            .call(d3.axisBottom(renderingData.scaleLinearX));
        let xAxisCluster;
        if (renderingData.dTypeCoefficient !== 0 && renderingData.eigenValue !== 0) {
            xAxisCluster = svg.append('line')
                .attr('x1', renderingData.scaleLinearX(-1))
                .attr('y1', zoomScaleY(0) + (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient)
                .attr('x2', renderingData.scaleLinearX(1))
                .attr('y2', zoomScaleY(0) - (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient)
                .attr('stroke-width', STROKE_THICKNESS.AXES_BACKGROUND)
                .attr('stroke', HEX_COLORS.BLACK)
        }
        // add Y axis    
        let yAxis = svg.append('g')
            .attr('transform', 'translate(' + getYAxisTranslatePos(zoomScaleX) + ', 0 )')
            .call(d3.axisLeft(zoomScaleY));

        /* pushing axes backwards */
        svg.selectAll('line').lower();
        svg.selectAll('g').lower();
        /* pushing axes backwards */

        let zoom = d3.zoom()
            .extent([[0, 0], [renderingData.limitDimensions.width, renderingData.limitDimensions.height]])
            .on('zoom', updateChart);

        // zoom on svg area    
        svg.call(zoom);

        function updateChart() {
            // recover the new scale
            let newX = d3.event.transform.rescaleX(zoomScaleX);
            let newY = d3.event.transform.rescaleY(zoomScaleY);

            // update axes position
            xAxis
                .attr('transform', 'translate(0,' + getXAxisTranslatePos(newY) + ')')
                .call(d3.axisBottom(newX));
            if (renderingData.dTypeCoefficient !== 0 && renderingData.eigenValue !== 0) {
                xAxisCluster
                    .attr('x1', newX(-1))
                    .attr('y1', newY(-renderingData.dTypeCoefficient))
                    .attr('x2', newX(1))
                    .attr('y2', newY(renderingData.dTypeCoefficient))

                /*.attr('transform', 'translate(' + newX(-1) + ',' + (newY(0) + (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient) + ',' + newX(1) + ',' + (newY(0) - (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient) + ')')
                .call(d3.axisBottom(newX));*/
            }
            yAxis
                .attr('transform', 'translate(' + getYAxisTranslatePos(newX) + ', 0 )')
                .call(d3.axisLeft(newY));

            // update nodes position
            nodeSvg
                .attr('cx', (d: KeyValueNode) => {
                    d.value.x = newX(d.value.originalX);
                    return d.value.x;
                })
                .attr('cy', (d: KeyValueNode) => {
                    if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
                        return d.value.y = newY(d.value.originalY)
                    } else {
                        return d.value.y = newY(d.value.originalY - 1 + renderingData.eigenValue)
                    }
                });

            // update edges position
            const nodesToRender = overlapRemovalMode === OVERLAP_REMOVAL.BINNING ? renderingData.binningNodes : renderingData.nodes;
            interEdgeSvg
                .attr('d', (d: Edge) => {
                    const start = newX(nodesToRender[d.source].originalX);
                    const end = newX(nodesToRender[d.target].originalX);
                    let startY;// = () => {
                    if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
                        startY = newY(nodesToRender[d.source].originalY);
                    } else {
                        startY = newY(nodesToRender[d.source].originalY - 1 + renderingData.eigenValue);
                    }
                    //}
                    let endY;// = () => {
                    if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
                        endY = newY(nodesToRender[d.target].originalY);
                    } else {
                        endY = newY(nodesToRender[d.target].originalY - 1 + renderingData.eigenValue);
                    }
                    //}
                    const orientation = d.sign === SignType.POSITIVE ? 1 : 0;
                    return ['M', start, startY, 'A',
                        (start - end) / 1.225, ',',
                        (start - end), 0, 0, ',',
                        orientation, end, ',', endY]
                        .join(' ');
                })

            intraEdgeSvg
                .attr('d', (d: Edge) => {
                    let start;
                    if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
                        start = newY(nodesToRender[d.source].originalY);
                    } else {
                        start = newY(nodesToRender[d.source].originalY - 1 + renderingData.eigenValue);
                    }
                    let end;
                    if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
                        end = newY(nodesToRender[d.target].originalY);
                    } else {
                        end = newY(nodesToRender[d.target].originalY - 1 + renderingData.eigenValue);
                    }
                    const x = newX(nodesToRender[d.source].originalX);
                    const sign = d.sign;
                    const oldX = newX(nodesToRender[d.source].originalX);
                    let orientation = nodesToRender[d.source].originalX <= 0 ? -1 : 0;
                    if ((d.sign === SignType.POSITIVE && oldX > 0) || (d.sign === SignType.NEGATIVE && oldX < 0)) {
                        orientation = nodesToRender[d.source].originalX <= 0 ? 0 : 1;
                    }
                    return ['M', x, start, 'A',
                        (start - end), ',',
                        (start - end), 0, 0, ',',
                        orientation, x, ',', end]
                        .join(' ');
                })

            /* pushing axes backwards */
            svg.selectAll('line').lower();
            svg.selectAll('g').lower();
            /* pushing axes backwards */
        }

        // simple old zoom
        function zoomed() {
            svg.attr('transform', d3.event.transform);
        }
    }

    /**
     * Enable to make the selected node connections visible with highlighting functionality
     * @param nodeSvg graph's nodes printed
     * @param interEdgeSvg graph's inter edges printed
     * @param intraEdgeSvg graph's intra edges printed
     * @param renderingData data for graph generation
     * @param edgesDynamicOpacity enable lower opacity for graph's nodes & edges to determine elements' concentration
     * @param showUnbalancement 
     */
    private highlight(
        nodeSvg: NodeSelection,
        interEdgeSvg: EdgeSelection,
        intraEdgeSvg: EdgeSelection,
        renderingData: GraphRenderingData,
        edgesDynamicOpacity?: boolean,
        showUnbalancement?: boolean
    ): void {
        const isEdgeToBeHighlighted = (d: KeyValueNode, linkD: Edge): boolean => {
            return linkD.source.toString() === d.key || linkD.target.toString() === d.key;
        };
        nodeSvg
            .on('mouseover', function (d: KeyValueNode) {
                // Highlight the nodes
                nodeSvg
                    .style('fill-opacity', NODES_OPACITY.LIGHTER)
                    .style(`opacity`, NODES_OPACITY.LIGHTER);
                d3.select(this)
                    .style('fill-opacity', NODES_OPACITY.STANDARD)
                    .style(`opacity`, NODES_OPACITY.STANDARD)
                //.raise();
                const nodesToHighlight: Array<string> = [...renderingData.interEdges, ...renderingData.intraEdges]
                    .map((e: Edge) => e.source.toString() === d.key ?
                        e.target.toString() : e.target.toString() === d.key ? e.source.toString() : undefined)
                    .filter((d: string) => !!d);
                nodeSvg
                    .filter((d: KeyValueNode) => nodesToHighlight.indexOf(d.key) >= 0)
                    .style('fill-opacity', NODES_OPACITY.MEDIUM)
                    .style(`opacity`, NODES_OPACITY.MEDIUM);
                // Highlight the inter edges
                interEdgeSvg
                    .style('stroke', (linkD: Edge): string => isEdgeToBeHighlighted(d, linkD) ?
                        ((linkD.sign === SignType.POSITIVE) ? HEX_COLORS.DARK_PASTEL_BLUE : HEX_COLORS.PASTEL_RED) : HEX_COLORS.LOBLOLLY)
                    .style('stroke-opacity', (linkD: Edge) => isEdgeToBeHighlighted(d, linkD) ? STROKE_OPACITY.STANDARD : STROKE_OPACITY.SEMI_HIDDEN)
                    .style('stroke-width', (linkD: Edge) => isEdgeToBeHighlighted(d, linkD) ? STROKE_THICKNESS.HIGHLIGHTED : STROKE_THICKNESS.HIGHLIGHTED_NOT_VISIBLE);
                // Highlight the intra edges
                intraEdgeSvg
                    .style('stroke', (linkD: Edge): string => isEdgeToBeHighlighted(d, linkD) ?
                        ((linkD.sign === SignType.POSITIVE) ? HEX_COLORS.DARK_PASTEL_BLUE : HEX_COLORS.PASTEL_RED) : HEX_COLORS.LOBLOLLY)
                    .style('stroke-opacity', (linkD: Edge) => isEdgeToBeHighlighted(d, linkD) ? STROKE_OPACITY.STANDARD : STROKE_OPACITY.SEMI_HIDDEN)
                    .style('stroke-width', (linkD: Edge) => isEdgeToBeHighlighted(d, linkD) ? STROKE_THICKNESS.HIGHLIGHTED : STROKE_THICKNESS.HIGHLIGHTED_NOT_VISIBLE);
            })
            .on('mouseout', (d: KeyValueNode) => {
                nodeSvg
                    .style('fill-opacity', NODES_OPACITY.LIGHT)
                    .style('opacity', NODES_OPACITY.STANDARD)
                interEdgeSvg
                    .style('stroke-width', (d: Edge) => this.getEdgeStrokeWidth(renderingData, d, showUnbalancement))
                    .style('stroke', (d: Edge) => this.getEdgeStrokeColor(renderingData, d, showUnbalancement))
                    .style('stroke-opacity', (d: Edge) => this.getEdgeStrokeOpacity(renderingData, d, showUnbalancement, edgesDynamicOpacity));
                intraEdgeSvg
                    .style('stroke-width', (d: Edge) => this.getEdgeStrokeWidth(renderingData, d, showUnbalancement))
                    .style('stroke', (d: Edge) => this.getEdgeStrokeColor(renderingData, d, showUnbalancement))
                    .style('stroke-opacity', (d: Edge) => this.getEdgeStrokeOpacity(renderingData, d, showUnbalancement, edgesDynamicOpacity));
            });
    };
/*
    private jitter(renderingData: GraphRenderingData, nodeSvg: NodeSelection, overlapRemovalMode: OVERLAP_REMOVAL) {
        let controls = d3.select("body").append("label")
            .attr("id", "controls");
        let checkbox = controls.append("input")
            .attr("id", "collisiondetection")
            .attr("type", "checkbox");
        controls.append("span")
            .text("Collision detection");

        const padding = 1, // separation between nodes
            radius = 6;

        function tick(e) {
            nodeSvg.each(moveTowardDataPosition(e.alpha));

            if (checkbox.node().checked) {
                nodeSvg.each(collide(e.alpha));
            }
            /*
            nodeSvg.attr("cx", function (d) { return d.value.x; })
                .attr("cy", function (d) { return d.value.y; });
                */
        /*}

        function moveTowardDataPosition(alpha) {
            return function (d: KeyValueNode) {
                d.value.x += (renderingData.scaleLinearX(d.value.originalX) - d.value.x) * 0.1 * alpha;
                d.value.y += (renderingData.scaleLinearY(d.value.originalY) - d.value.y) * 0.1 * alpha;
            };
        }

        // Resolve collisions between nodes.
        function collide(alpha) {
            const nodesToRender = overlapRemovalMode === OVERLAP_REMOVAL.CUSTOM ? renderingData.binningNodes : renderingData.nodes;
            let data = d3.range(1000).map(function () {
                return [Math.random() * renderingData.limitDimensions.width, Math.random() * renderingData.limitDimensions.height];
            });
            let quadtree = d3.quadtree(d3.entries(nodesToRender));
            return function (d: KeyValueNode) {
                var r = d.value.radius + radius + padding,
                    nx1 = d.value.x - r,
                    nx2 = d.value.x + r,
                    ny1 = d.value.y - r,
                    ny2 = d.value.x + r;
                quadtree.visit((node: d3.QuadtreeInternalNode<KeyValueNode>, x1, y1, x2, y2) => {
                    if (node.point && (node.point !== d) {
                        var x = d.value.x - node.point.x,
                            y = d.value.y - node.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.value.radius + node.point.radius /*+ (d.color !== quad.point.color) * padding*/;
    /*if (l < r) {
        l = (l - r) / l * alpha;
        d.value.x -= x *= l;
        d.value.y -= y *= l;
        node.point.x += x;
        node.point.y += y;
    }
}
return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
});
};
}
}*/

    /**
     * Avoids overlapping nodes by showing only one node for a certain portion of the x axis
     * @param renderingData data for graph generation
     */
    private binningMode(renderingData: GraphRenderingData) {
        const binningNodes: { [key: string]: BinningNode } = {};

        for (let i = -1; i <= 1; i += 0.025) {
            const rangeNodes: Array<Node> = Object.values(renderingData.nodes)
                .filter((node: Node) => (node.originalX < i + 0.025) && (node.originalX >= i) && (node.originalY === 1 || renderingData.dTypeCoefficient !== 0));
            if (!!rangeNodes.length) {
                if (rangeNodes.length === 1) {
                    binningNodes[rangeNodes[0].id] = {
                        ...rangeNodes[0],
                        replacedNodesCount: 1
                    }
                } else {
                    binningNodes[rangeNodes[0].id] = {
                        ...rangeNodes[0],
                        y: renderingData.dTypeCoefficient !== 0 ? rangeNodes[0].y : renderingData.scaleLinearY(rangeNodes[0].originalY - 1 + renderingData.eigenValue),
                        x: renderingData.scaleLinearX(i + (0.025 / 2)),
                        originalX: i + (0.025 / 2),
                        replacedNodesCount: rangeNodes.length,
                    };
                    for (let j = 0; j < renderingData.interEdges.length; j++) {
                        if (rangeNodes.find((node: Node) => node.id === renderingData.interEdges[j].source)) {
                            renderingData.interEdges[j].source = rangeNodes[0].id;
                        }
                        if (rangeNodes.find((node: Node) => node.id === renderingData.interEdges[j].target)) {
                            renderingData.interEdges[j].target = rangeNodes[0].id;
                        }
                    }
                    for (let j = 0; j < renderingData.intraEdges.length; j++) {
                        if (rangeNodes.find((node: Node) => node.id === renderingData.intraEdges[j].source)) {
                            renderingData.intraEdges[j].source = rangeNodes[0].id;
                        }
                        if (rangeNodes.find((node: Node) => node.id === renderingData.intraEdges[j].target)) {
                            renderingData.intraEdges[j].target = rangeNodes[0].id;
                        }
                    }
                }
            }
        }
        const nodesOverEigenValueAxis: { [key: string]: BinningNode } = {};
        for (const node of Object.values(renderingData.nodes)) {
            if (node.originalY > 1) {
                nodesOverEigenValueAxis[node.id] = {
                    ...node,
                    replacedNodesCount: 1
                }
            }
        }
        console.log(JSON.stringify(binningNodes));
        console.log(JSON.stringify(renderingData.intraEdges));
        console.log(JSON.stringify(renderingData.interEdges));

        renderingData.binningNodes = { ...binningNodes, ...nodesOverEigenValueAxis };
    }

    /**
     * Remove node overlapping to make all nodes visible
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     */
    private overlapRemovalMode(renderingData: GraphRenderingData, d: KeyValueNode, mode: OVERLAP_REMOVAL): number {
        switch (mode) {
            case OVERLAP_REMOVAL.BINNING:
                const maxRadius = (): number => {
                    let max = Number.MIN_VALUE;
                    for (const node of Object.values(renderingData.binningNodes)) {
                        const radius = node.replacedNodesCount;
                        max = Math.max(max, radius);
                    }
                    return max <= 1 ? 2 : max;
                };
                const scaleBinning = d3.scaleLinear()
                    .domain([1, maxRadius()])
                    .range([6, 15]);
                return scaleBinning((d.value as BinningNode).replacedNodesCount);
            case OVERLAP_REMOVAL.COUNT_EDGES:
                const maxEdges = (): number => {
                    let max = Number.MIN_VALUE;

                    for (const n of Object.values(renderingData.nodes)) {
                        let countMaxEdges = 0;
                        for (const interEdge of Object.values(renderingData.interEdges)) {
                            if (interEdge.source === n.id || interEdge.target === n.id) {
                                countMaxEdges++;
                            }
                        }
                        for (const intraEdge of Object.values(renderingData.intraEdges)) {
                            if (intraEdge.source === n.id || intraEdge.target === n.id) {
                                countMaxEdges++;
                            }
                        }
                        max = Math.max(max, countMaxEdges);
                    }
                    return max;
                }
                const myEdges = (kv: KeyValueNode): number => {
                    let countMyEdges = 0;
                    for (const interEdge of Object.values(renderingData.interEdges)) {
                        if (interEdge.source.toString() === kv.key || interEdge.target.toString() === kv.key) {
                            countMyEdges++;
                        }
                    }
                    for (const intraEdge of Object.values(renderingData.intraEdges)) {
                        if (intraEdge.source.toString() === kv.key || intraEdge.target.toString() === kv.key) {
                            countMyEdges++;
                        }
                    }
                    return countMyEdges;
                }
                const scaleEdge = d3.scaleLinear()
                    .domain([1, maxEdges()])
                    .range([6, 15]);
                return scaleEdge(myEdges(d));
        }
    }

    /**
     * Print graph's nodes
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     */
    private printNodes(svg: D3SvgElement, renderingData: GraphRenderingData, overlapRemovalMode: OVERLAP_REMOVAL): NodeSelection {
        const getNodesRadius = (d: KeyValueNode) => {
            if (overlapRemovalMode === OVERLAP_REMOVAL.NONE) {
                return d.value.radius = 6; // standard way
            }
            return d.value.radius = this.overlapRemovalMode(renderingData, d, overlapRemovalMode);
        };

        const getNodesFill = (d: KeyValueNode) => {
            return (d.value.group === 1 ? HEX_COLORS.FIRST_GROUP :
                (d.value.group === 2 ?
                    HEX_COLORS.SECOND_GROUP : HEX_COLORS.BLACK
                )
            );
        };

        const nodesToRender = overlapRemovalMode === OVERLAP_REMOVAL.BINNING ? renderingData.binningNodes : renderingData.nodes;
        /*const nodesComparator = (a: Node, b: Node) => {
            if (getNodesRadius({ key: a.id.toString(), value: a }) > getNodesRadius({ key: b.id.toString(), value: b })) {
                return -1;
            } else if (getNodesRadius({ key: a.id.toString(), value: a }) < getNodesRadius({ key: b.id.toString(), value: b })) {
                return 1;
            }
            return 0;
        };
        const sortedNodes = Object.values(nodesToRender).sort(nodesComparator);
        //.sort((a: Node, b: Node) => d3.descending(getNodesRadius({ key: a.id.toString(), value: a }), getNodesRadius({ key: b.id.toString(), value: b })));
    */

        const nodeSvg = svg.selectAll('.node')
            .data(d3.entries(nodesToRender).sort((a, b) => getNodesRadius(b) - getNodesRadius(a))) // funziona ma lento e non va bene dopo highlighting
            //.data(d3.entries(nodesToRender))
            .enter().append('circle')
            .attr('cx', (d: KeyValueNode) => d.value.x)
            .attr('cy', (d: KeyValueNode) => d.value.y)
            .attr('r', (d: KeyValueNode) => d.value.radius)
            .attr('fill', (d: KeyValueNode) => getNodesFill(d))
            .attr('fill-opacity', NODES_OPACITY.LIGHT)
            .attr('stroke', HEX_COLORS.WHITE);
        //.style('z-index', (d: KeyValueNode) => -getNodesRadius(d));;
        return nodeSvg;
    }

    /**
     * Print graph's inter edges
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     * @param edgesDynamicOpacity enable lower opacity for graph's nodes & edges to determine elements' concentration
     */
    private printIntraEdges(svg: D3SvgElement, renderingData: GraphRenderingData, edgesDynamicOpacity?: boolean, showUnbalancement?: boolean): EdgeSelection {
        // archi con stessa ascissa --> stessa x
        const intraEdges = svg.selectAll('mylinks')
            .data(renderingData.intraEdges)
            .enter()
            .append('path')
            .attr('d', (d: Edge) => {
                const start = renderingData.nodes[d.source].y;
                const end = renderingData.nodes[d.target].y;
                const x = renderingData.nodes[d.source].x;
                const sign = d.sign;
                const oldX = renderingData.nodes[d.source].originalX;
                let orientation = 0; // switch to invert
                if ((d.sign === SignType.POSITIVE && oldX > 0) || (d.sign === SignType.NEGATIVE && oldX < 0)) {
                    orientation = 1; // switch to invert
                }
                return ['M', x, start, 'A',
                    (start - end), ',',
                    (start - end), 0, 0, ',',
                    orientation, x, ',', end]
                    .join(' ');
            })
            .style('fill', 'none')
            .attr('stroke-width', (linkD: Edge) => this.getEdgeStrokeWidth(renderingData, linkD, showUnbalancement))
            .attr('stroke', (d: Edge) => this.getEdgeStrokeColor(renderingData, d, showUnbalancement))
            .attr('stroke-opacity', (d: Edge) => this.getEdgeStrokeOpacity(renderingData, d, showUnbalancement, edgesDynamicOpacity));
        return intraEdges;
    }

    /**
     * Print graph's inter edges
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     * @param edgesDynamicOpacity enable lower opacity for graph's nodes & edges to determine elements' concentration
     */
    private printInterEdges(svg: D3SvgElement, renderingData: GraphRenderingData, edgesDynamicOpacity?: boolean, showUnbalancement?: boolean): EdgeSelection {
        // archi con ascissa diversa --> x diverse
        const interEdges = svg.selectAll('mylinks')
            .data(renderingData.interEdges)
            .enter()
            .append('path')
            .attr('d', (d: Edge) => {
                const start = renderingData.nodes[d.source].x;
                const end = renderingData.nodes[d.target].x;
                const startY = renderingData.nodes[d.source].y;
                const endY = renderingData.nodes[d.target].y;
                const orientation = d.sign === SignType.POSITIVE ? 1 : 0;
                return ['M', start, startY, 'A',
                    (start - end) / 1.225, ',',
                    (start - end), 0, 0, ',',
                    orientation, end, ',', endY]
                    .join(' ');
            })
            .style('fill', 'none')
            .attr('stroke-width', (linkD: Edge) => this.getEdgeStrokeWidth(renderingData, linkD, showUnbalancement))
            .attr('stroke', (d: Edge) => this.getEdgeStrokeColor(renderingData, d, showUnbalancement))
            .attr('stroke-opacity', (d: Edge) => this.getEdgeStrokeOpacity(renderingData, d, showUnbalancement, edgesDynamicOpacity));
        return interEdges;
    }

    /**
     * Set edge's stroke width
     * @param renderingData data for graph generation
     * @param edge element which stoke width has to be calculated
     * @param showUnbalancement whether unbalancement mode is active
     */
    private getEdgeStrokeWidth(renderingData: GraphRenderingData, edge: Edge, showUnbalancement?: boolean): number {
        const isPositiveEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            return (linkD.sign === SignType.POSITIVE && ((start < 0 && end > 0) || (start > 0 && end < 0)));
        };

        const isNegativeEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            const groupStart = renderingData.nodes[linkD.source].group;
            const groupEnd = renderingData.nodes[linkD.target].group;
            return (linkD.sign === SignType.NEGATIVE && ((start < 0 && end < 0) || (start > 0 && end > 0)));
        };
        if (showUnbalancement) {
            if (isPositiveEdgeUnbalanced(edge) || isNegativeEdgeUnbalanced(edge)) {
                return STROKE_THICKNESS.UNBALANCED_VISIBLE;
            } else {
                return STROKE_THICKNESS.UNBALANCED_NOT_VISIBLE;
            }
        } else {
            return STROKE_THICKNESS.STANDARD;
        }
    }

    /**
     * Set edge's stroke color
     * @param renderingData data for graph generation
     * @param edge element which stoke color has to be calculated
     * @param showUnbalancement whether unbalancement mode is active
     */
    private getEdgeStrokeColor(renderingData: GraphRenderingData, edge: Edge, showUnbalancement?: boolean): HEX_COLORS {
        const isPositiveEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            const groupStart = renderingData.nodes[linkD.source].group;
            const groupEnd = renderingData.nodes[linkD.target].group;
            return (linkD.sign === SignType.POSITIVE && ((start < 0 && end > 0) || (start > 0 && end < 0)));
        };

        const isNegativeEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            const groupStart = renderingData.nodes[linkD.source].group;
            const groupEnd = renderingData.nodes[linkD.target].group;
            return (linkD.sign === SignType.NEGATIVE && ((start < 0 && end < 0) || (start > 0 && end > 0)));
        };
        if (showUnbalancement) {
            if (isPositiveEdgeUnbalanced(edge)) {
                return HEX_COLORS.DARK_PASTEL_BLUE;
            } else if (isNegativeEdgeUnbalanced(edge)) {
                return HEX_COLORS.PASTEL_RED;
            } else {
                return HEX_COLORS.LOBLOLLY;
            }
        } else {
            return (edge.sign === SignType.POSITIVE) ? HEX_COLORS.DARK_PASTEL_BLUE : HEX_COLORS.PASTEL_RED;
        }
    }

    /**
     * Set edge's stroke opacity
     * @param renderingData data for graph generation
     * @param edge element which stoke has to be calculated
     * @param showUnbalancement whether unbalancement mode is active
     * @param edgesDynamicOpacity whether dynamic opacity mode is active
     */
    private getEdgeStrokeOpacity(renderingData: GraphRenderingData, edge: Edge, showUnbalancement?: boolean, edgesDynamicOpacity?: boolean): number {
        const isPositiveEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            const groupStart = renderingData.nodes[linkD.source].group;
            const groupEnd = renderingData.nodes[linkD.target].group;
            return (linkD.sign === SignType.POSITIVE && ((start < 0 && end > 0) || (start > 0 && end < 0)));
        };

        const isNegativeEdgeUnbalanced = (linkD: Edge): boolean => {
            const start = renderingData.nodes[linkD.source].originalX;
            const end = renderingData.nodes[linkD.target].originalX;
            const groupStart = renderingData.nodes[linkD.source].group;
            const groupEnd = renderingData.nodes[linkD.target].group;
            return (linkD.sign === SignType.NEGATIVE && ((start < 0 && end < 0) || (start > 0 && end > 0)));
        };
        if (showUnbalancement) {
            if (isPositiveEdgeUnbalanced(edge) || isNegativeEdgeUnbalanced(edge)) {
                return STROKE_OPACITY.STANDARD;
            } else {
                return STROKE_OPACITY.SEMI_HIDDEN;
            }
        } else if (edgesDynamicOpacity) {
            return STROKE_OPACITY.DYNAMIC;
        } else {
            return STROKE_OPACITY.STANDARD;
        }
    }

    /**
     * Print ticks on graph's y and x axes
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     */
    private printAxesTicks(svg: D3SvgElement, renderingData: GraphRenderingData): void {
        // tick x
        const xAxis = d3.axisBottom(renderingData.scaleLinearX)
            .ticks(20)
            .tickSize(5)
            .tickPadding(5);

        const gX = svg.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0, ${renderingData.dTypeCoefficient !== 0 ? renderingData.limitDimensions.midHeight : (renderingData.limitDimensions.midHeight * 4 / 3)})`)
            .call(xAxis);

        // tick y
        const tickY = d3.scaleLinear().domain([0, renderingData.limitCoordinates.maxY]).range([renderingData.scaleLinearY(0), renderingData.scaleLinearY(renderingData.limitCoordinates.maxY)]);
        const yAxis = d3.axisLeft(renderingData.dTypeCoefficient !== 0 ? renderingData.scaleLinearY : tickY)
            .ticks((renderingData.limitDimensions.width + 2) / (renderingData.limitDimensions.height + 2) * 10)
            .tickSize(5)
            .tickPadding(5);

        const gY = svg.append('g')
            .attr('class', 'axis axis--y')
            .attr('transform', 'translate(' + renderingData.limitDimensions.midWidth + ',0)')
            .call(yAxis);
    }

    /**
     * Print graph y and x axes
     * @param svg DOM element to be edited appending axes
     * @param renderingData data for graph generation
     */
    private printAxes(svg: D3SvgElement, renderingData: GraphRenderingData): void {
        // show the axes
        if (renderingData.eigenValue === 0) {
            let xAxis = svg.append('line')
                .attr('x1', renderingData.scaleLinearX(-1))
                .attr('y1', renderingData.limitDimensions.midHeight * 4 / 3)
                .attr('x2', renderingData.scaleLinearX(1))
                .attr('y2', renderingData.limitDimensions.midHeight * 4 / 3)
                .attr('stroke-width', STROKE_THICKNESS.AXES)
                .attr('stroke', HEX_COLORS.BLACK);
        } else {
            let xAxis = svg.append('line')
                .attr('x1', renderingData.scaleLinearX(-1))
                .attr('y1', renderingData.scaleLinearY(renderingData.dTypeCoefficient !== 0 ? 0 : renderingData.eigenValue)
                    + (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient)
                .attr('x2', renderingData.scaleLinearX(1))
                .attr('y2', renderingData.scaleLinearY(renderingData.dTypeCoefficient !== 0 ? 0 : renderingData.eigenValue)
                    - (renderingData.limitDimensions.midHeight - 30) * renderingData.dTypeCoefficient)
                .attr('stroke-width', STROKE_THICKNESS.AXES)
                .attr('stroke', HEX_COLORS.BLACK);
            // x-axis origin
            let xAxisOrigin = svg.append('line')
                .attr('x1', renderingData.scaleLinearX(-1))
                .attr('y1', renderingData.scaleLinearY(0))
                .attr('x2', renderingData.scaleLinearX(1))
                .attr('y2', renderingData.scaleLinearY(0))
                .attr('stroke-width', STROKE_THICKNESS.AXES_BACKGROUND)
                .attr('stroke', HEX_COLORS.BLACK)
                .style('opacity', 0.5);
            // print y-axis interception label
            svg.append('text')
                .attr('transform', 'translate(' + (renderingData.dTypeCoefficient !== 0 ?
                    (renderingData.limitDimensions.midWidth + 60) :
                    (renderingData.limitDimensions.width - 10)) + ', ' + (renderingData.dTypeCoefficient !== 0 ? (65) :
                        (renderingData.scaleLinearY(renderingData.eigenValue) - 5)) + ')')
                .style('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .style('font-size', '12px')
                .text(' y = ' + renderingData.eigenValue.toFixed(2));
        }
        // y-axis
        let yAxis = svg.append('line')
            .attr('x1', renderingData.scaleLinearX(0))
            .attr('y1', 30)
            .attr('x2', renderingData.scaleLinearX(0))
            .attr('y2', renderingData.limitDimensions.height - 30)
            .attr('stroke-width', STROKE_THICKNESS.AXES_BACKGROUND)
            .attr('stroke', HEX_COLORS.BLACK)
            .style('opacity', 0.5);

        // print x-axis interception label
        svg.append('text')
            .attr('transform', 'translate(' + (renderingData.limitDimensions.width - 13) + ', ' + (renderingData.scaleLinearY(0) + 5) + ')')
            .style('text-anchor', 'middle')
            .style('font-weight', renderingData.eigenValue === 0 ? 'bold' : '')
            .style('font-size', '12px')
            .text(' y = 0');
    }

    /**
     * Scale nodes' coordinates on desired graph size
     * @param renderingData data for graph generation
     */
    private scaleCoordinatesOnSvgSize(renderingData: GraphRenderingData): void {
        // rescale the coordinates based on the size of the drawing area
        renderingData.scaleLinearX = d3.scaleLinear().domain([-1, 1]).range([50, renderingData.limitDimensions.width - 50]);

        if (renderingData.eigenValue !== 0 && renderingData.dTypeCoefficient !== 0) {
            renderingData.scaleLinearY = d3.scaleLinear().domain([-1, 1]).range([renderingData.limitDimensions.height - 30, 30]);
            for (let i = 0; i < Object.values(renderingData.nodes).length; i++) {
                renderingData.nodes[i].x = renderingData.scaleLinearX(renderingData.nodes[i].x);
                renderingData.nodes[i].y = renderingData.scaleLinearY(renderingData.nodes[i].y);
            }
        } else {
            renderingData.scaleLinearY = d3.scaleLinear().domain([0, renderingData.limitCoordinates.maxY])
                .range([renderingData.limitDimensions.midHeight * 4 / 3, 30]);
            for (let i = 0; i < Object.values(renderingData.nodes).length; i++) {
                renderingData.nodes[i].x = renderingData.scaleLinearX(renderingData.nodes[i].x);
                renderingData.nodes[i].y = renderingData.scaleLinearY(renderingData.nodes[i].y - 1 + renderingData.eigenValue);
            }
        }
    }

    /**
     * Initialize initial rendering data in a single object
     * @param data response obtained from Controller
     * @param width svg desired width
     * @param height svg desired height
     */
    private initRenderingData(data: GraphResponse, width: number, height: number): GraphRenderingData {

        // minimum and maximum coordinates
        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;

        // nodes
        const nodes: { [key: string]: Node } = {};
        for (const node of data.nodes) {
            const id = node.id;
            const group = node.group;
            const x = node.x; // switch to invert
            let y = node.y;
            if (data.eigenValue !== 0 && data.dTypeCoefficient !== 0) {
                y = x * data.dTypeCoefficient;
            }

            nodes[id] = {
                id,
                x,
                y,
                originalX: x,
                originalY: y,
                group
            };

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // variables for drawing
        const midWidth = width / 2;
        const midHeight = height / 2;

        return {
            dTypeCoefficient: data.dTypeCoefficient,
            eigenValue: data.eigenValue,
            limitCoordinates: {
                minX,
                minY,
                maxX,
                maxY
            },
            limitDimensions: {
                width,
                height,
                midWidth,
                midHeight
            },
            nodes,
            interEdges: data.interEdges,
            intraEdges: data.intraEdges
        };
    }

}
