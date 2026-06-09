export type Trend = 'up' | 'flat' | 'down' | 'new'

export const getTrend = (pw: number[]): Trend => {
    if (!pw || pw.length < 2) return 'new'
    const last = pw[pw.length - 1]
    const prev = pw[pw.length - 2]
    return last > prev ? 'up' : last < prev ? 'down' : 'flat'
}

export const estimateMax = (weight: number, reps: number) =>
    reps === 1 ? weight : Math.round(weight * (1 + reps / 30))

export const getNextTarget = (weight: number, pastWeights: number[], _reps?: number): number => {
    const sessions = pastWeights?.length || 0
    const trend = getTrend(pastWeights)
    if (sessions < 2 || trend === 'down') return weight
    if (trend === 'flat') return weight + 5
    const rate = sessions < 8 ? Math.round(weight * 0.05) : sessions < 20 ? Math.round(weight * 0.025) : Math.round(weight * 0.0125)
    return weight + Math.max(rate, 5)
}
