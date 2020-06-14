import { Edge } from '../edge';
import { Node } from '../node';

export interface GraphResponse {
    nodes: Array<Node>;
    intraEdges: Array<Edge>;
    interEdges: Array<Edge>;
    dTypeCoefficient: number;
    eigenValue: number;
}
