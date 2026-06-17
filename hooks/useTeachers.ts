'use client'
import { useState, useEffect } from 'react'
import { useSchoolStore } from '@/store/useSchoolStore'

const FIFTEEN_MINUTES = 15 * 60 * 1000

export function useTeachers(schoolId: string) {
  const { 
    teachers, 
    setTeachers, 
    isStale,
    teachersLastFetched 
  } = useSchoolStore()
  
  const [loading, setLoading] = useState(
    teachers.length === 0
  )
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    // If data is fresh, dont refetch
    if (!isStale(teachersLastFetched, FIFTEEN_MINUTES) && teachers.length > 0) {
      setLoading(false)
      return
    }

    const fetchTeachers = async () => {
      try {
        if (teachers.length === 0) {
          setLoading(true)
        }
        const res = await fetch('/api/principal/teachers')
        const data = await res.json()
        setTeachers(data.teachers || data.data || [])
      } catch {
        setError('Failed to load teachers')
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [schoolId, teachersLastFetched, teachers.length, isStale, setTeachers])

  return { teachers, loading, error }
}
