import { API_URL } from '../config'

export type Session = {
    weight: number
    date: string   // epoch ms as string
    seconds: number
}

export type Lift = {
    _id: string
    name: string
    weight: number
    sets: number
    reps: number
    type: string
    pastWeights: number[]
    sessions?: Session[]
}

export type LiftInput = {
    name: string
    weight: number
    sets: number
    reps: number
    type: string
}

/**
 * Parameterized GraphQL request. Uses query *variables* (never string
 * interpolation) so user input — lift names, etc. — can't break or inject
 * into the query. Throws on GraphQL errors so callers can handle failure.
 *
 * Auto-retries on network failures and 5xx responses. express-graphql returns
 * resolver errors as HTTP 200 with an `errors` array, so any 5xx from this stack
 * is always a pre-resolver infrastructure error (e.g. a Vercel cold-start DB
 * connection race) — no write has happened, making retries safe.
 */
const MAX_RETRIES = 2
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function gql<T = any>(
    query: string,
    variables: Record<string, unknown> = {},
    token?: string | null,
    attempt = 0
): Promise<T> {
    let res: Response
    try {
        res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ query, variables }),
        })
    } catch (netErr) {
        if (attempt < MAX_RETRIES) {
            await delay(500 * (attempt + 1))
            return gql<T>(query, variables, token, attempt + 1)
        }
        throw new Error('Could not reach the server. Check your connection.')
    }

    // 5xx = server warming up / DB connection race — wait and retry
    if (res.status >= 500 && attempt < MAX_RETRIES) {
        await delay(600 * (attempt + 1))
        return gql<T>(query, variables, token, attempt + 1)
    }

    let json: any
    try {
        json = await res.json()
    } catch {
        if (res.status >= 500 && attempt < MAX_RETRIES) {
            await delay(600 * (attempt + 1))
            return gql<T>(query, variables, token, attempt + 1)
        }
        throw new Error('Server returned an invalid response.')
    }

    if (json?.errors?.length) throw new Error(json.errors[0]?.message || 'Request failed.')
    return json.data as T
}

/* ─── Queries ─── */
const USER_LIFTS = `query { userLifts { _id name weight sets reps type pastWeights sessions { weight date seconds } } }`

export const fetchUserLifts = (token: string | null) =>
    gql<{ userLifts: Lift[] }>(USER_LIFTS, {}, token).then(d => d.userLifts || [])

export const loginRequest = (email: string, password: string) =>
    gql<{ login: { userId: string; token: string; tokenExpiration: number } }>(
        `query Login($email: String!, $password: String!) {
            login(email: $email, password: $password) { userId token tokenExpiration }
        }`,
        { email, password }
    )

export const signUpRequest = (email: string, password: string) =>
    gql<{ createUser: { _id: string } }>(
        `mutation SignUp($userInput: UserInput) {
            createUser(userInput: $userInput) { _id }
        }`,
        { userInput: { email, password } }
    )

/* ─── Mutations (injection-safe) ─── */
export const createLift = (input: LiftInput, token: string | null) =>
    gql(`mutation Create($liftInput: LiftInput) { createLift(liftInput: $liftInput) { _id } }`,
        { liftInput: input }, token)

export const editLift = (liftId: string, input: LiftInput, token: string | null) =>
    gql(`mutation Edit($liftId: ID!, $liftInput: LiftInput) {
            editLift(liftId: $liftId, liftInput: $liftInput) { _id name weight pastWeights }
        }`, { liftId, liftInput: input }, token)

export const deleteLift = (liftId: string, token: string | null) =>
    gql(`mutation Del($liftId: ID!) { deleteLift(liftId: $liftId) { _id } }`,
        { liftId }, token)

// Log a workout session — appends a new pastWeights entry (even at the same
// weight) plus the date and how long the lift took, server-side.
export const logSession = (liftId: string, weight: number, seconds: number, token: string | null) =>
    gql(`mutation Log($liftId: ID!, $weight: Int!, $seconds: Int) {
            logSession(liftId: $liftId, weight: $weight, seconds: $seconds) { _id pastWeights sessions { weight date seconds } }
        }`, { liftId, weight, seconds }, token)

/* ─── localStorage lift cache (non-sensitive: no tokens/passwords) ─── */
const CACHE_KEY = 'ironlog_lifts_cache'

export function getCachedLifts(userId: string | null): Lift[] | null {
    if (!userId) return null
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed.userId === userId ? (parsed.lifts as Lift[]) : null
    } catch {
        return null
    }
}

export function setCachedLifts(userId: string | null, lifts: Lift[]) {
    if (!userId) return
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, lifts, ts: Date.now() }))
    } catch { /* quota / private mode — ignore */ }
}

export function clearLiftsCache() {
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
