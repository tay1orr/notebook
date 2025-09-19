'use client'

import { useState, useEffect } from 'react'
import { StudentsManagement } from './students-management'

interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  grade?: string
  class?: string
  isApprovedHomeroom?: boolean
}

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
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true)
        console.log('StudentsManagement - Loading students from API...')

        // 사용자 정보, 대여 목록, 사용자 목록을 동시에 가져오기
        const [userResponse, loansResponse, usersResponse] = await Promise.all([
          fetch('/api/debug/role-check', { cache: 'no-store' }),
          fetch('/api/loans', { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' })
        ])

        // 사용자 정보 처리
        let userInfo: UserInfo | null = null
        if (userResponse.ok) {
          const userData = await userResponse.json()
          userInfo = {
            id: userData.user.id,
            email: userData.user.email,
            name: userData.user.name,
            role: userData.roleData?.[0]?.role || 'student',
            grade: userData.user.grade,
            class: userData.user.class,
            isApprovedHomeroom: userData.user.isApprovedHomeroom
          }
          setUser(userInfo)
          console.log('StudentsManagement - User info loaded:', userInfo)
        }

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

          let studentsArray = Array.from(studentMap.values())

          // 담임교사인 경우 자신의 반 학생만 필터링
          if (userInfo && userInfo.role === 'homeroom' && userInfo.isApprovedHomeroom && userInfo.grade && userInfo.class) {
            const userGrade = parseInt(userInfo.grade)
            const userClass = parseInt(userInfo.class)

            studentsArray = studentsArray.filter(student => {
              // 학생의 학급 정보에서 학년과 반 추출
              if (student.className) {
                // 학급 형태: "2-1", "2학년 1반" 등
                let match = student.className.match(/(\d+)-(\d+)/) // "2-1" 형태
                if (!match) {
                  match = student.className.match(/(\d+)학년\s*(\d+)반/) // "2학년 1반" 형태
                }
                if (!match) {
                  match = student.className.match(/(\d+)\.(\d+)/) // "2.1" 형태
                }

                if (match) {
                  const studentGrade = parseInt(match[1])
                  const studentClass = parseInt(match[2])
                  return studentGrade === userGrade && studentClass === userClass
                }
              }
              return false
            })

            console.log(`StudentsManagement - Filtered for homeroom teacher ${userGrade}-${userClass}:`, studentsArray.length, 'students')
          } else {
            console.log('StudentsManagement - No filtering applied (admin or non-homeroom user)')
          }

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