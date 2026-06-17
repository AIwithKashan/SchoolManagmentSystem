import { revalidateTag } from 'next/cache'

export const invalidateCache = {
  students: () => revalidateTag('students'),
  teachers: () => revalidateTag('teachers'),
  classes: () => revalidateTag('classes'),
  attendance: () => revalidateTag('attendance'),
  fees: () => revalidateTag('fees'),
  announcements: () => revalidateTag('announcements'),
  schoolStats: () => revalidateTag('school-stats'),
  all: () => {
    revalidateTag('students')
    revalidateTag('teachers')
    revalidateTag('classes')
    revalidateTag('attendance')
    revalidateTag('fees')
    revalidateTag('announcements')
    revalidateTag('school-stats')
  }
}
