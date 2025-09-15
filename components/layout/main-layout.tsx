import { requireAuth } from '@/lib/auth'
import { Header } from './header'

interface MainLayoutProps {
  children: React.ReactNode
}

export async function MainLayout({ children }: MainLayoutProps) {
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}