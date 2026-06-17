'use client'
import { useState, useEffect } from 'react'
import { useSchoolStore } from '@/store/useSchoolStore'

const THIRTY_MINUTES = 30 * 60 * 1000

export function useClasses(schoolId: string) {
  const { 
    classes, 
    setClasses, 
    isStale,
    classesLastFetched 
  } = useSchoolStore()
  
  const [loading, setLoading] = useState(
    classes.length === 0
  )
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    // If data is fresh, dont refetch
    if (!isStale(classesLastFetched, THIRTY_MINUTES) && classes.length > 0) {
      setLoading(false)
      return
    }

    const fetchClasses = async () => {
      try {
        if (classes.length === 0) {
          setLoading(true)
        }
        const res = await fetch('/api/principal/classes')
        const data = await res.json()
        setClasses(data.classes || data.data || [])
      } catch {
        setError('Failed to load classes')
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [schoolId, classesLastFetched, classes.length, isStale, setClasses])

  return { classes, loading, error }
}
