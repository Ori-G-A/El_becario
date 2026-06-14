import { useContext } from 'react'
import { LockContext } from './lock-context'

export function useLock() {
  const ctx = useContext(LockContext)
  if (!ctx) {
    throw new Error('useLock debe usarse dentro de <LockProvider>.')
  }
  return ctx
}
