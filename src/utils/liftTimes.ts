import type { Session } from './api'

/* ─── Formatting ─── */
export function fmtDur(seconds: number): string {
    if (!seconds || seconds < 0) return '—'
    const s = Math.round(seconds)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const rem = s % 60
    return rem ? `${m}m ${rem}s` : `${m}m`
}

export function fmtDate(ts: number | string): string {
    const n = typeof ts === 'string' ? parseInt(ts) : ts
    if (!n) return ''
    try { return new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
    catch { return '' }
}

/* ─── Session helpers (server-backed: lift.sessions) ─── */
export function timedSessions(sessions?: Session[]): Session[] {
    return (sessions || []).filter(s => s.seconds > 0)
}

export function avgSessionSeconds(sessions?: Session[]): number {
    const t = timedSessions(sessions)
    if (!t.length) return 0
    return Math.round(t.reduce((sum, e) => sum + e.seconds, 0) / t.length)
}

export function bestSessionSeconds(sessions?: Session[]): number {
    const t = timedSessions(sessions)
    return t.length ? Math.min(...t.map(e => e.seconds)) : 0
}

/** 'down' = faster than previous (green), 'up' = slower (red), 'flat'/'new'. */
export function sessionTimeTrend(sessions?: Session[]): 'down' | 'up' | 'flat' | 'new' {
    const t = timedSessions(sessions)
    if (t.length < 2) return 'new'
    const last = t[t.length - 1].seconds
    const prev = t[t.length - 2].seconds
    return last < prev ? 'down' : last > prev ? 'up' : 'flat'
}

/** Average lift time across all of a user's lifts — for the bento stat. */
export function avgSecondsAcross(lifts: { sessions?: Session[] }[]): number {
    const all = lifts.flatMap(l => timedSessions(l.sessions))
    if (!all.length) return 0
    return Math.round(all.reduce((s, e) => s + e.seconds, 0) / all.length)
}

/* ─── Workout streak (from server session dates) ─── */
function dayKey(ms: number): string {
    const d = new Date(ms)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function computeWorkoutStreak(lifts: { sessions?: Session[] }[]): number {
    const daySet = new Set<string>()
    lifts.forEach(l => (l.sessions || []).forEach(s => {
        const ms = parseInt(String(s.date))
        if (ms) daySet.add(dayKey(ms))
    }))
    if (!daySet.size) return 0
    const today = new Date()
    const toKey = (d: Date) => dayKey(d.getTime())
    const todayK = toKey(today)
    const yest = new Date(today); yest.setDate(today.getDate() - 1)
    const yesterdayK = toKey(yest)
    let cur = daySet.has(todayK) ? new Date(today) : daySet.has(yesterdayK) ? new Date(yest) : null
    if (!cur) return 0
    let streak = 0
    while (daySet.has(toKey(cur))) {
        streak++
        cur.setDate(cur.getDate() - 1)
    }
    return streak
}

export function lastWorkoutDaysAgo(lifts: { sessions?: Session[] }[]): number | null {
    const allMs = lifts.flatMap(l => (l.sessions || []).map(s => parseInt(String(s.date))).filter(Boolean))
    if (!allMs.length) return null
    return Math.floor((Date.now() - Math.max(...allMs)) / 86400000)
}

/* ─── Whole-workout duration history (localStorage; per-device indicator) ─── */
export type WorkoutTimeEntry = { date: number; seconds: number }
const WORKOUT_TIMES_KEY = 'ironlog_workout_times'
const MAX_ENTRIES = 30

export function getWorkoutTimes(): WorkoutTimeEntry[] {
    try { return JSON.parse(localStorage.getItem(WORKOUT_TIMES_KEY) || '[]') } catch { return [] }
}

export function addWorkoutTime(seconds: number, date = Date.now()) {
    if (seconds <= 0) return
    const arr = getWorkoutTimes()
    arr.push({ date, seconds: Math.round(seconds) })
    try { localStorage.setItem(WORKOUT_TIMES_KEY, JSON.stringify(arr.slice(-MAX_ENTRIES))) } catch { /* quota */ }
}
