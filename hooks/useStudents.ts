'use client'
import { useState, useEffect } from 'react'
import { useSchoolStore } from '@/store/useSchoolStore'

export function useStudents(schoolId: string) {
  const { 
    students, 
    setStudents, 
    isStale,
    studentsLastFetched 
  } = useSchoolStore()
  
  const [loading, setLoading] = useState(
    students.length === 0
  )
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    // If data is fresh, dont refetch
    if (!isStale(studentsLastFetched) && students.length > 0) {
      setLoading(false)
      return
    }

    const fetchStudents = async () => {
      try {
        if (students.length === 0) {
          setLoading(true)
        }
        const res = await fetch('/api/principal/students')
        const data = await res.json()
        setStudents(data.students || data.data || [])
      } catch {
        setError('Failed to load students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [schoolId, studentsLastFetched, students.length, isStale, setStudents])

  return { students, loading, error }
}
