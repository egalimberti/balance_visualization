import { Node } from '../node';
import { Edge } from '../edge';

export interface SpectralAnalysis {
    nodes: Array<Node>;
    edges: Array<Edge>;
    L: Array<Array<number>>;
    eigenvalue: number;
    dtypeCoefficient: number;
}

export interface Eig {
    eigValue: number;
    eigVector: Array<number>;
}

export interface GraphEdges {
    intraEdges: Array<Edge>;
    interEdges: Array<Edge>;
}
