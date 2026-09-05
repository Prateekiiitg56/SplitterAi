import { useState, useEffect, useCallback } from 'react'
import { healthCheck } from '../lib/api'

export function useBackendHealth(pollIntervalMs = 10000) {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkStatus = useCallback(async () => {
    const online = await healthCheck()
    setIsOnline(online)
    setLastChecked(new Date())
  }, [])

  useEffect(() => {
    checkStatus()
    const timer = setInterval(checkStatus, pollIntervalMs)
    return () => clearInterval(timer)
  }, [checkStatus, pollIntervalMs])

  return { isOnline, lastChecked, checkStatus }
}
