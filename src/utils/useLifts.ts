import { useContext, useState, useEffect, useCallback, useRef } from 'react'
import { AuthContext } from '../context/context'
import { fetchUserLifts, getCachedLifts, setCachedLifts, type Lift } from './api'

/**
 * Shared lift loader with stale-while-revalidate caching.
 *
 * - On mount, hydrates instantly from the localStorage cache (no skeleton flash
 *   when returning to a page), then revalidates from the API in the background.
 * - With no cache, shows a loading state for the first fetch.
 * - `refresh()` re-pulls from the API and updates the cache; pass nothing for a
 *   silent refresh (no skeleton) after a mutation.
 */
export function useLifts() {
    const { token, userId } = useContext(AuthContext)
    const [lifts, setLifts] = useState<Lift[]>(() => getCachedLifts(userId) || [])
    const [loading, setLoading] = useState(() => !getCachedLifts(userId))
    const mounted = useRef(true)

    const refresh = useCallback((showSkeleton = false) => {
        if (showSkeleton) setLoading(true)
        return fetchUserLifts(token)
            .then(data => {
                if (!mounted.current) return
                setLifts(data)
                setCachedLifts(userId, data)
            })
            .catch(err => console.error(err))
            .finally(() => { if (mounted.current) setLoading(false) })
    }, [token, userId])

    useEffect(() => {
        mounted.current = true
        // skeleton only when we have nothing cached to show
        refresh(!getCachedLifts(userId))
        return () => { mounted.current = false }
    }, [refresh, userId])

    return { lifts, loading, refresh, token, userId }
}
