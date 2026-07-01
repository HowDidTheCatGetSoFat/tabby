export type TilePreset = 'grid' | 'columns' | 'rows' | 'master'

/**
 * Returns the column stride used to walk the tabs while tiling.
 * A child is placed to the right of the previous one until the running
 * column index wraps back to zero, at which point a new row is started.
 */
export function tilingStride (count: number, preset: TilePreset): number {
    if (preset === 'columns') {
        return count + 2
    }
    if (preset === 'rows') {
        return 1
    }
    return Math.max(1, Math.ceil(Math.sqrt(count)))
}
