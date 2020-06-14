import {
    SpectralAnalysis,
    Eig,
    GraphRequest,
    GraphResponse,
    GraphEdges,
    Node,
    Edge,
    SignType,
} from '../../commons/models';
import { DTYPE } from '../../commons/consts';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxSpinnerService } from 'ngx-spinner';
import numeric from 'numeric';

@Injectable({
    providedIn: 'root',
})
export class ViewGraphGeneratorService {
    constructor(protected http: HttpClient, private spinner: NgxSpinnerService) { }

    /**
     * Calling BE API to generate response
     * @param request request for graph generation
     */
    public async callServiceGenerateGraph(
        request: GraphRequest,
        decimalPrecision?: number
    ): Promise<GraphResponse | void> {
        this.spinner.show();
        return this.http.post<GraphResponse>(
            `/graphs${!!decimalPrecision ? `?dp=${decimalPrecision}` : ''}`,
            {
                dType: request.dType,
                graph: request.graph,
            }
        ).toPromise().then((data: GraphResponse) => {
            setTimeout(() => {
                this.spinner.hide();
            }, 800);
            return data;
        }).catch((err) => {
            setTimeout(() => {
                this.spinner.hide();
            }, 800);
        });
    }

    /**
     * Calling BE API to generate response
     * @param request request for graph generation
     */
    public callServiceGetDefaultData(
        entry?: string
    ): Promise<Array<string> | string> {
        if (!entry) {
            return this.http.get<Array<string>>('/graphs').toPromise();
        } else {
            return this.http.get<string>(`/graphs?entry=${entry}`).toPromise();
        }
    }

    /**
     * Test function to generate response on client side
     * @param request request for graph generation
     */
    public processGraphRequest(
        request: GraphRequest,
        decimalPrecision = 10
    ): GraphResponse {
        // type of decomposition
        const dtype: DTYPE = request.dType;
        // graph stucture
        const graph: string = request.graph;

        // read nodes and edges
        const nodesMap: { [key: number]: Node } = {};
        const edgesList = new Array<Edge>();

        const cvsSplitBy = ',';

        const lines: Array<string> = graph.split('\n');

        for (const line of lines) {
            if (!!line) {
                const data: Array<string> = line.trim().split(cvsSplitBy);

                const sourceId: number = Number.parseInt(data[0], 10);
                const targetId: number = Number.parseInt(data[1], 10);
                const weight: number = Number.parseInt(data[2], 10);
                const groupSource: number = Number.parseInt(data[3], 10);
                const groupTarget: number = Number.parseInt(data[4], 10);

                // update the map with the nodes
                let source: Node;
                if (!nodesMap[sourceId]) {
                    source = {
                        id: sourceId,
                        x: 0,
                        y: 0,
                        originalX: 0,
                        originalY: 0,
                        group: groupSource,
                    };
                    nodesMap[sourceId] = source;
                } else {
                    source = nodesMap[sourceId];
                }

                let target: Node;
                if (!nodesMap[targetId]) {
                    target = {
                        id: targetId,
                        x: 0,
                        y: 0,
                        originalX: 0,
                        originalY: 0,
                        group: groupTarget,
                    };
                    nodesMap[targetId] = target;
                } else {
                    target = nodesMap[targetId];
                }

                // add the edge to the list
                const edge: Edge = {
                    id: lines.indexOf(line),
                    source: source.id,
                    target: target.id,
                    sign: weight > 0 ? SignType.POSITIVE : SignType.NEGATIVE,
                };
                edgesList.push(edge);
            }
        }

        /* Fix non progressive nodes -> reassign ids */
        let progressiveIndex = 0;
        for (const nodeKey in nodesMap) {
            if (
                nodesMap.hasOwnProperty(nodeKey) &&
                progressiveIndex !== nodesMap[nodeKey].id
            ) {
                for (const edge of edgesList) {
                    if (edge.source === nodesMap[nodeKey].id) {
                        edge.source = progressiveIndex;
                    }
                    if (edge.target === nodesMap[nodeKey].id) {
                        edge.target = progressiveIndex;
                    }
                }
                nodesMap[progressiveIndex] = {
                    ...nodesMap[nodeKey],
                    id: progressiveIndex,
                };
                delete nodesMap[nodeKey];
                progressiveIndex++;
            } else {
                progressiveIndex++;
            }
        }
        /* Fix non progressive nodes -> reassign ids */

        // execute the spectral analysis
        const spectral: SpectralAnalysis = {
            nodes: Object.values(nodesMap),
            edges: edgesList,
            L: this.buildLaplacianMatrix(Object.values(nodesMap), edgesList),
            eigenvalue: -1,
            dtypeCoefficient: 0,
        };

        const eig: Eig = this.eigenDecomposition(spectral.L, decimalPrecision);

        spectral.eigenvalue = eig.eigValue;
        spectral.nodes = this.setNodesClusters(spectral.nodes, eig.eigVector, 1, 1);
        spectral.dtypeCoefficient = this.calcDtypeCoefficient(
            spectral.nodes,
            dtype
        );

        // generating response
        const definitiveEdges: GraphEdges = this.getDefinitiveEdges(
            spectral.edges,
            spectral.nodes
        );
        const layoutInterEdges: Array<Edge> = definitiveEdges.interEdges;
        const layoutIntraEdges: Array<Edge> = definitiveEdges.intraEdges;
        const eigenvalue = spectral.eigenvalue;

        const result: GraphResponse = {
            nodes: spectral.nodes,
            intraEdges: layoutIntraEdges,
            interEdges: layoutInterEdges,
            dTypeCoefficient: spectral.dtypeCoefficient,
            eigenValue: eigenvalue, // only 2 decimals
        };

        return result;
    }

    public getDefinitiveEdges(
        edges: Array<Edge>,
        nodes: Array<Node>
    ): GraphEdges {
        const intraEdges: Array<Edge> = new Array<Edge>();
        const interEdges: Array<Edge> = new Array<Edge>();

        const generateDefinitiveEdge = (
            e: Edge,
            sourceNode: Node,
            targetNode: Node
        ): Edge => {
            const result: Edge = {
                ...e,
                consecutive:
                    sourceNode.cluster === targetNode.cluster &&
                    Math.abs(sourceNode.originalY - targetNode.originalY) === 1,
            };
            if (
                sourceNode.x > targetNode.x ||
                (sourceNode.x === targetNode.x && sourceNode.y < targetNode.y)
            ) {
                result.source = targetNode.id;
                result.target = sourceNode.id;
            }
            return result;
        };

        for (const e of edges) {
            const sourceNode = nodes.find((node: Node) => node.id === e.source);
            const targetNode = nodes.find((node: Node) => node.id === e.target);
            if (sourceNode.cluster === targetNode.cluster) {
                intraEdges.push(generateDefinitiveEdge(e, sourceNode, targetNode));
            } else {
                interEdges.push(generateDefinitiveEdge(e, sourceNode, targetNode));
            }
        }

        return { intraEdges, interEdges };
    }

    private calcDtypeCoefficient(nodes: Array<Node>, dtype: string): number {
        // scale based on the number of nodes in the clusters
        if (dtype === DTYPE.CLUSTER_SIZE) {
            const numberOfNodes: number = nodes.length;
            let numberOfLeftNodes = 0;
            let numberOfRightNodes = 0;

            for (const node of nodes) {
                if (!!node.x && node.x < 0) {
                    numberOfLeftNodes += 1;
                } else {
                    numberOfRightNodes += 1;
                }
            }

            numberOfLeftNodes /= numberOfNodes;
            numberOfRightNodes /= numberOfNodes;

            return numberOfLeftNodes - numberOfRightNodes;
        }
        return 0;
    }

    private buildLaplacianMatrix(
        nodes: Array<Node>,
        edges: Array<Edge>
    ): Array<Array<number>> {
        const result = new Array<Array<number>>(nodes.length)
            .fill(undefined)
            .map(() => new Array<number>(nodes.length).fill(0));
        const getEdgeWeight = (edge: Edge): number => {
            if (edge.sign === SignType.POSITIVE) {
                return 1;
            } else if (edge.sign === SignType.NEGATIVE) {
                return -1;
            } else {
                return 0;
            }
        };

        for (const e of edges) {
            const s: number = e.source;
            const t: number = e.target;

            result[s][t] = -getEdgeWeight(e);
            result[t][s] = -getEdgeWeight(e);
            result[s][s] += 1;
            result[t][t] += 1;
        }
        return result;
    }

    private setNodesClusters(
        nodes: Array<Node>,
        eigVector: Array<number>,
        xScaleFactor: number,
        yScaleFactor: number
    ): Array<Node> {
        const distinctEv: { [key: number]: number } = {};
        const clusters: Array<number> = new Array<number>();
        const definitiveNodes = [...nodes];

        for (const n of eigVector) {
            if (!!distinctEv[n]) {
                distinctEv[n] += 1;
            } else {
                distinctEv[n] = 1;
                clusters.push(n);
            }
        }

        for (let i = 0; i < definitiveNodes.length; i++) {
            const originalX: number = eigVector[definitiveNodes[i].id];
            const originalY: number = distinctEv[originalX];
            const cluster: number = clusters.indexOf(originalX);
            const x: number = originalX * xScaleFactor;
            const y: number = originalY * yScaleFactor;
            distinctEv[originalX] = originalY - 1;

            definitiveNodes[i] = {
                ...definitiveNodes[i],
                x,
                y,
                originalX,
                originalY,
                cluster,
            };
        }

        return definitiveNodes;
    }

    private eigenDecomposition(
        L: Array<Array<number>>,
        decimalPrecision: number
    ): Eig {
        const getMaxAbsValue = (eigenvector: Array<number>): number => {
            let max = Math.abs(eigenvector[0]);

            for (let i = 1; i < eigenvector.length; i++) {
                const abs = Math.abs(eigenvector[i]);
                if (abs > max) {
                    max = abs;
                }
            }
            return max;
        };

        const getMinOrMaxValueIndex = (
            values: Array<number>,
            getMax: boolean
        ): number => {
            let index = 0;
            let value = values[0];

            for (let i = 1; i < values.length; i++) {
                if (getMax) {
                    if (values[i] > value) {
                        index = i;
                        value = values[i];
                    }
                } else {
                    if (values[i] < value) {
                        index = i;
                        value = values[i];
                    }
                }
            }
            return index;
        };

        // compute the SVD decompositions of the laplacian
        const matrix = numeric.blockMatrix(L);
        const SVD = numeric.svd(matrix);
        const svdEigenValues: Array<number> = SVD.S;
        const svdEigenVectors: Array<Array<number>> = SVD.U;

        /*
            // first element of positive sign -> invert all signs if not (no changes in result)
            if (!!svdEigenVectors.length && svdEigenVectors[0].length && svdEigenVectors[0][0] < 0) {
                svdEigenVectors.forEach((vector: Array<number>, index: number) => {
                    svdEigenVectors[index].forEach((n: number, i: number) => {
                        svdEigenVectors[index][i] = -n;
                    });
                });
            }
            */

        // get the index of the minimum eigenvalue
        const minEigenValueIndex = getMinOrMaxValueIndex(svdEigenValues, false);

        // get the minimum eigenvalue
        const minEigenvalue = svdEigenValues[minEigenValueIndex];

        // get the minimum eigenvector
        const eigenVector: Array<number> = svdEigenVectors.map(
            (eigVector: Array<number>) => eigVector[minEigenValueIndex]
        );

        // get the element of the eigenvector of highest absolute value
        let maxAbsValue: number = getMaxAbsValue(eigenVector);
        if (maxAbsValue === 0) {
            maxAbsValue = 1;
        }

        // normalize the eigenvector of interest
        for (let i = 0; i < eigenVector.length; i++) {
            const roundValue =
                Math.round(
                    (eigenVector[i] / maxAbsValue) * Math.pow(10, decimalPrecision)
                ) / Math.pow(10, decimalPrecision);
            eigenVector[i] = Number.parseFloat(roundValue.toFixed(7));
        }

        return {
            eigVector: eigenVector,
            eigValue: minEigenvalue,
        };
    }
}
