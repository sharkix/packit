'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'packit_theme'

/**
 * Runs before first paint (injected into <head>) so the page never flashes the
 * wrong theme. Kept as a string because it has to execute synchronously.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

interface ThemeCtx {
  theme: Theme
  /** The theme actually applied right now (system resolved to light/dark) */
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx>({
  theme: 'system',
  resolved: 'light',
  setTheme: () => {},
})

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(theme: Theme): 'light' | 'dark' {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  return dark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  // Adopt whatever the pre-paint script already decided
  useEffect(() => {
    let stored: Theme = 'system'
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system'
    } catch {
      /* private mode — fall back to system */
    }
    setThemeState(stored)
    setResolved(apply(stored))
  }, [])

  // Follow the OS while the user is on "system"
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(apply('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setResolved(apply(t))
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* quota / private mode — the theme still applies for this session */
    }
  }, [])

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme() {
  return useContext(Ctx)
}
