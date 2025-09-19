'use client'

import { useState, useEffect } from 'react'
import { StudentsManagement } from './students-management'

export function StudentsManagementWrapper() {
  const [students, setStudents] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    withLoan: 0,
    overdue: 0,
    active: 0,
    inactive: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true)
        console.log('StudentsManagement - Loading students from API...')

        // 대여 목록과 사용자 목록을 동시에 가져오기
        const [loansResponse, usersResponse] = await Promise.all([
          fetch('/api/loans', { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' })
        ])

        if (loansResponse.ok && usersResponse.ok) {
          const { loans } = await loansResponse.json()
          const { users } = await usersResponse.json()

          console.log('StudentsManagement - Loaded loans:', loans.length)
          console.log('StudentsManagement - Loaded users:', users.length)

          // 사용자 역할 맵 생성
          const userRoles = new Map()
          users.forEach(user => {
            userRoles.set(user.email, user.role || '')
            console.log('StudentsManagement - User role mapping:', user.email, '->', user.role || '')
          })

          // 대여 데이터에서 학생 정보 추출 (이메일 기준으로 중복 제거)
          const studentMap = new Map()
          loans.forEach(loan => {
            const email = loan.email
            if (!studentMap.has(email)) {
              const userRole = userRoles.get(email) || ''

              studentMap.set(email, {
                id: email,
                studentNo: loan.student_no || loan.studentNo,
                name: loan.student_name || loan.studentName,
                className: loan.class_name || loan.className,
                email: email,
                phone: loan.student_contact || loan.studentContact || '',
                parentPhone: '',
                role: userRole,
                currentLoan: null,
                loanHistory: 0,
                overdueCount: 0,
                status: 'active',
                allLoans: []
              })
            }

            const student = studentMap.get(email)
            student.loanHistory++
            student.allLoans.push(loan)

            // 현재 대여 중인 기기 확인 (가장 최근 것)
            if (loan.status === 'picked_up') {
              student.currentLoan = loan.device_tag || loan.deviceTag
              student.dueDate = loan.due_date || loan.dueDate

              // 연체 확인 (실시간)
              const isOverdue = loan.due_date || loan.dueDate ?
                new Date() > new Date(loan.due_date || loan.dueDate) : false
              if (isOverdue) {
                student.overdueCount++
              }
            }
          })

          const studentsArray = Array.from(studentMap.values())
          console.log('StudentsManagement - Final students array:', studentsArray.length)
          setStudents(studentsArray)

          // 통계 계산
          const newStats = {
            total: studentsArray.length,
            withLoan: studentsArray.filter(s => s.currentLoan).length,
            overdue: studentsArray.filter(s => s.overdueCount > 0).length,
            inactive: studentsArray.filter(s => s.loanHistory === 0).length,
            active: studentsArray.filter(s => s.loanHistory > 0).length
          }
          console.log('StudentsManagement - Stats:', newStats)
          setStats(newStats)
          setError(null)
        } else {
          const errorText = await (loansResponse.ok ? usersResponse : loansResponse).text()
          console.error('StudentsManagement - API error:', errorText)
          setError(`API 오류: ${errorText}`)
        }
      } catch (error) {
        console.error('StudentsManagement - Failed to load students:', error)
        setError(`학생 목록을 불러올 수 없습니다: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">학생 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="font-medium mb-2">오류 발생</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  return <StudentsManagement students={students} stats={stats} />
}