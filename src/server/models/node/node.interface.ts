export interface Node {
    id: number;
    x: number;
    y: number;
    originalX: number;
    originalY: number;
    cluster?: number;
    group?: number;
    radius?: number;
}

export interface BinningNode extends Node {
    replacedNodesCount: number;
}

export interface KeyValueNode { key: string; value: Node; }
