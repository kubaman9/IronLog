import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './WeightChart.css'

type WeightChartProps = {
    liftName: string
    pastWeights: number[]
}

export default function WeightChart({ liftName, pastWeights }: WeightChartProps) {
    if (!pastWeights || pastWeights.length === 0) {
        return (
            <div className='weight-chart-container'>
                <p className='no-data-message'>No weight history yet. Max out to start tracking progress!</p>
            </div>
        )
    }

    const data = pastWeights.map((weight, index) => ({
        index: index + 1,
        weight: weight
    }))

    const minWeight = Math.min(...pastWeights)
    const maxWeight = Math.max(...pastWeights)
    const avgWeight = Math.round(pastWeights.reduce((a, b) => a + b) / pastWeights.length)

    return (
        <div className='weight-chart-container'>
            <div className='chart-header'>
                <h4>{liftName} Progress</h4>
                <div className='chart-stats'>
                    <div className='stat'>
                        <span className='stat-label'>Max:</span>
                        <span className='stat-value'>{maxWeight} lbs</span>
                    </div>
                    <div className='stat'>
                        <span className='stat-label'>Min:</span>
                        <span className='stat-value'>{minWeight} lbs</span>
                    </div>
                    <div className='stat'>
                        <span className='stat-label'>Avg:</span>
                        <span className='stat-value'>{avgWeight} lbs</span>
                    </div>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis 
                        dataKey="index" 
                        label={{ value: 'Attempts', position: 'insideBottomRight', offset: -5 }}
                        stroke="var(--text-secondary)"
                    />
                    <YAxis 
                        label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
                        stroke="var(--text-secondary)"
                    />
                    <Tooltip 
                        contentStyle={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text)'
                        }}
                        formatter={(value) => `${value} lbs`}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="var(--accent)" 
                        dot={{ fill: 'var(--accent)', r: 4 }}
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
