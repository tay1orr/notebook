'use client'

import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/components/providers/theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <div className="flex items-center space-x-2">
            <SunIcon className="h-4 w-4" />
            <span>라이트</span>
          </div>
        </SelectItem>
        <SelectItem value="dark">
          <div className="flex items-center space-x-2">
            <MoonIcon className="h-4 w-4" />
            <span>다크</span>
          </div>
        </SelectItem>
        <SelectItem value="system">
          <div className="flex items-center space-x-2">
            <MonitorIcon className="h-4 w-4" />
            <span>시스템</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0"
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}