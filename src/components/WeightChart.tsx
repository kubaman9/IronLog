import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Session } from '../utils/api'
import { timedSessions, avgSessionSeconds, bestSessionSeconds, sessionTimeTrend, fmtDur, fmtDate } from '../utils/liftTimes'
import './WeightChart.css'

type WeightChartProps = {
    liftName: string
    pastWeights: number[]
    sessions?: Session[]
}

function LiftTimes({ sessions }: { sessions?: Session[] }) {
    const timed = timedSessions(sessions)
    if (timed.length === 0) return null

    const recent = timed.slice(-10)
    const max = Math.max(...recent.map(t => t.seconds), 1)
    const last = timed[timed.length - 1].seconds
    const avg = avgSessionSeconds(sessions)
    const best = bestSessionSeconds(sessions)
    const trend = sessionTimeTrend(sessions)

    return (
        <div className='lift-times'>
            <div className='lift-times-header'>
                <h4>Lift Time</h4>
                <div className='lift-times-stats'>
                    <div className='lt-stat'>
                        <span className='lt-stat-label'>Last</span>
                        <span className={`lt-stat-value trend-${trend}`}>
                            {trend === 'down' ? '↓' : trend === 'up' ? '↑' : ''}{fmtDur(last)}
                        </span>
                    </div>
                    <div className='lt-stat'>
                        <span className='lt-stat-label'>Avg</span>
                        <span className='lt-stat-value'>{fmtDur(avg)}</span>
                    </div>
                    <div className='lt-stat'>
                        <span className='lt-stat-label'>Best</span>
                        <span className='lt-stat-value lt-best'>{fmtDur(best)}</span>
                    </div>
                </div>
            </div>
            <div className='lift-times-bars'>
                {recent.map((t, i) => {
                    const isBest = t.seconds === best
                    return (
                        <div key={i} className='lt-bar-col' title={`${t.weight} lbs · ${fmtDur(t.seconds)} · ${fmtDate(t.date)}`}>
                            <div
                                className={`lt-bar ${isBest ? 'best' : ''}`}
                                style={{ height: `${Math.max(8, Math.round((t.seconds / max) * 100))}%` }}
                            />
                        </div>
                    )
                })}
            </div>
            <div className='lift-times-foot'>
                <span>{fmtDate(recent[0].date)}</span>
                <span className='lift-times-hint'>Lower is faster · best in green</span>
                <span>{fmtDate(recent[recent.length - 1].date)}</span>
            </div>
        </div>
    )
}

const WeightTip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    return (
        <div className='wc-tip'>
            <strong>{p.weight} lbs</strong>
            {p.date && <span>{p.date}</span>}
        </div>
    )
}

export default function WeightChart({ liftName, pastWeights, sessions }: WeightChartProps) {
    const hasWeights = pastWeights && pastWeights.length > 0
    const sess = sessions || []
    // sessions align with the tail of pastWeights (both grow together going forward)
    const offset = Math.max(0, (pastWeights?.length || 0) - sess.length)

    const data = (pastWeights || []).map((weight, i) => {
        const s = i >= offset ? sess[i - offset] : undefined
        return { session: `S${i + 1}`, weight, date: s ? fmtDate(s.date) : `S${i + 1}` }
    })
    const minWeight = hasWeights ? Math.min(...pastWeights) : 0
    const maxWeight = hasWeights ? Math.max(...pastWeights) : 0
    const prIdx = hasWeights ? pastWeights.lastIndexOf(maxWeight) : -1

    // Show at most every Nth label so the x-axis doesn't crowd
    const tickInterval = data.length > 12 ? Math.floor(data.length / 6) : data.length > 6 ? 1 : 0

    return (
        <div className='weight-chart-container'>
            {hasWeights ? (
                <>
                    <div className='chart-header'>
                        <h4>{liftName} <span className='chart-sessions-count'>{pastWeights.length} sessions</span></h4>
                        <div className='chart-stats'>
                            <div className='stat'>
                                <span className='stat-label'>PR</span>
                                <span className='stat-value accent'>{maxWeight} lbs</span>
                            </div>
                            <div className='stat'>
                                <span className='stat-label'>Start</span>
                                <span className='stat-value'>{minWeight} lbs</span>
                            </div>
                            <div className='stat'>
                                <span className='stat-label'>+Gained</span>
                                <span className={`stat-value ${maxWeight > minWeight ? 'green' : ''}`}>{maxWeight - minWeight} lbs</span>
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} interval={tickInterval} />
                            <YAxis
                                stroke="var(--text-secondary)"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v: number) => `${v}`}
                                unit=" lb"
                                width={46}
                            />
                            <Tooltip content={<WeightTip />} />
                            <Line
                                type="monotone"
                                dataKey="weight"
                                stroke="var(--accent)"
                                dot={(props: any) => {
                                    const { cx, cy, index } = props
                                    const isPR = index === prIdx && pastWeights.length > 1
                                    return (
                                        <circle
                                            key={index}
                                            cx={cx} cy={cy}
                                            r={isPR ? 6 : 3}
                                            fill={isPR ? 'var(--green)' : 'var(--accent)'}
                                            stroke={isPR ? 'var(--green)' : 'var(--accent)'}
                                            strokeWidth={isPR ? 2 : 1}
                                        />
                                    )
                                }}
                                activeDot={{ r: 6 }}
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </>
            ) : (
                <p className='no-data-message'>No weight history yet. Hit New Max to start tracking!</p>
            )}

            <LiftTimes sessions={sessions} />
        </div>
    )
}
