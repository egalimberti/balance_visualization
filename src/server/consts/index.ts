export enum DTYPE {
    NONE = 'none',
    CLUSTER_SIZE = 'cluster size'
}

export enum OVERLAP_REMOVAL {
    NONE = 'normal',
    BINNING = 'data binning',
    COUNT_EDGES = 'number of edges'
}

export enum HEX_COLORS {
    WHITE = '#ffffff',
    BLACK = '#000000',
    DARK_PASTEL_BLUE = '#779ecb',
    PASTEL_RED = '#ff6961',
    LOBLOLLY = '#b8b8b8',
    FIRST_GROUP = '#fd7e14',
    SECOND_GROUP = '#28a745'
}

export enum STROKE_THICKNESS {
    STANDARD = 1.5,
    HIGHLIGHTED = 1.5,
    HIGHLIGHTED_NOT_VISIBLE = 1,
    UNBALANCED_VISIBLE = 2,
    UNBALANCED_NOT_VISIBLE = 0.8,
    AXES = 2.5,
    AXES_BACKGROUND = 2
}

export enum STROKE_OPACITY {
    STANDARD = 1,
    DYNAMIC = 0.4,
    SEMI_HIDDEN = 0.4
}

export enum NODES_OPACITY {
    STANDARD = 1,
    MEDIUM = 0.8,
    LIGHT = 0.4,
    LIGHTER = 0.2
}
