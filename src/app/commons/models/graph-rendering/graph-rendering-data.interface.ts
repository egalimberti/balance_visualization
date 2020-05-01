import { Edge } from '../edge';
import { Node, BinningNode } from '../node';

export interface GraphRenderingData {
    limitCoordinates: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    limitDimensions: {
        width: number;
        height: number;
        midWidth: number;
        midHeight: number;
    };
    dTypeCoefficient: number;
    eigenValue: number;
    nodes: { [key: string]: Node };
    intraEdges: Array<Edge>;
    interEdges: Array<Edge>;
    binningNodes?: { [key: string]: BinningNode };
    scaleLinearX?: d3.ScaleLinear<number, number>;
    scaleLinearY?: d3.ScaleLinear<number, number>;
}
