'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps {
  onClick: () => Promise<void>
  children: React.ReactNode
  className?: string
  variant?: string
  disabled?: boolean
}

export function LoadingButton({ 
  onClick, 
  children, 
  className,
  variant = 'default',
  disabled 
}: LoadingButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return // prevent double click
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading || disabled}
      className={className}
      variant={variant as any}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {loading ? 'Loading...' : children}
    </Button>
  )
}
