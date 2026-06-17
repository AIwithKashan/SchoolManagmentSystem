import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Student {
  id: string
  name: string
  rollNumber: string
  class: { name: string; section: string }
}

interface SchoolStore {
  // Cached data
  students: Student[]
  teachers: any[]
  classes: any[]
  stats: {
    totalStudents: number
    totalTeachers: number
    totalClasses: number
    attendanceToday: number
  } | null
  
  // Last fetch timestamps
  studentsLastFetched: number | null
  teachersLastFetched: number | null
  classesLastFetched: number | null
  statsLastFetched: number | null

  // Actions
  setStudents: (students: Student[]) => void
  setTeachers: (teachers: any[]) => void
  setClasses: (classes: any[]) => void
  setStats: (stats: any) => void
  
  // Check if data is stale (older than X ms)
  isStale: (lastFetched: number | null, maxAge?: number) => boolean
  
  // Clear cache
  clearCache: () => void
}

const FIVE_MINUTES = 5 * 60 * 1000

export const useSchoolStore = create<SchoolStore>()(
  persist(
    (set) => ({
      students: [],
      teachers: [],
      classes: [],
      stats: null,
      studentsLastFetched: null,
      teachersLastFetched: null,
      classesLastFetched: null,
      statsLastFetched: null,

      setStudents: (students) => set({ 
        students, 
        studentsLastFetched: Date.now() 
      }),
      
      setTeachers: (teachers) => set({ 
        teachers, 
        teachersLastFetched: Date.now() 
      }),
      
      setClasses: (classes) => set({ 
        classes, 
        classesLastFetched: Date.now() 
      }),
      
      setStats: (stats) => set({ 
        stats, 
        statsLastFetched: Date.now() 
      }),

      isStale: (lastFetched, maxAge = FIVE_MINUTES) => {
        if (!lastFetched) return true
        return Date.now() - lastFetched > maxAge
      },

      clearCache: () => set({
        students: [],
        teachers: [],
        classes: [],
        stats: null,
        studentsLastFetched: null,
        teachersLastFetched: null,
        classesLastFetched: null,
        statsLastFetched: null,
      })
    }),
    {
      name: 'edumind-school-store',
      // Only persist non-sensitive data
      partialize: (state) => ({
        classes: state.classes,
        classesLastFetched: state.classesLastFetched,
      })
    }
  )
)
