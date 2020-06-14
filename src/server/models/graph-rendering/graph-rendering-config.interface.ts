import { DTYPE, OVERLAP_REMOVAL } from '../../consts';

export interface GraphRenderingConfig {
    darkMode: boolean;
    decimalPrecision: number;
    dtype: DTYPE;
    width: number;
    height: number;
    svgDomId: string;
    showZoom?: boolean;
    showAxesTicks?: boolean;
    edgesDynamicOpacity?: boolean;
    highlight?: boolean;
    showUnbalancement?: boolean;
    overlapRemovalMode: OVERLAP_REMOVAL;
}
