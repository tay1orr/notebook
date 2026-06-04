'use client'

import { useState } from 'react'

interface RoleSelectionProps {
  user: {
    name: string
    email: string
  }
  onComplete?: (userData: {
    role: 'student' | 'homeroom'
    grade?: string
    class?: string
    studentNo?: string
    pendingApproval?: boolean
  }) => void
}

export function RoleSelection({ user, onComplete }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<'student' | 'homeroom' | null>(null)
  const [grade, setGrade] = useState('')
  const [classNo, setClassNo] = useState('')
  const [studentNo, setStudentNo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const classOptions = Array.from({ length: 13 }, (_, i) => (i + 1).toString())

  const handleSubmit = async () => {
    if (!selectedRole) return

    if (selectedRole === 'student' && (!grade || !classNo || !studentNo)) {
      setError('학년, 반, 번호를 모두 입력해주세요.')
      return
    }
    if (selectedRole === 'homeroom' && (!grade || !classNo)) {
      setError('담당 학년과 반을 입력해주세요.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const userData = {
        role: selectedRole,
        grade,
        class: classNo,
        studentNo: selectedRole === 'student' ? studentNo : undefined,
        pendingApproval: selectedRole === 'homeroom',
      }

      if (onComplete) {
        await onComplete(userData)
        return
      }

      const response = await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error('역할 저장에 실패했습니다.')
      }

      window.location.reload()
    } catch (err: any) {
      setError(err.message || '역할 설정 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 mb-4 shadow-lg">
            <span className="text-white font-bold text-sm">중산</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">역할 선택</h1>
          <p className="text-sm text-slate-500 mt-1">
            안녕하세요, <span className="font-medium text-slate-700">{user.name}</span>님!
            처음 로그인하셨네요.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Role cards */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">역할을 선택해주세요</label>

            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`w-full text-left rounded-lg border-2 transition-all p-4 ${
                selectedRole === 'student'
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  selectedRole === 'student' ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                }`} />
                <div>
                  <div className="font-semibold text-slate-900">학생</div>
                  <div className="text-xs text-slate-500 mt-0.5">노트북 대여를 신청하는 학생</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('homeroom')}
              className={`w-full text-left rounded-lg border-2 transition-all p-4 ${
                selectedRole === 'homeroom'
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  selectedRole === 'homeroom' ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">담임교사</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">승인 필요</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">담당반 학생들의 대여를 관리하는 교사</div>
                </div>
              </div>
            </button>
          </div>

          {/* Student fields */}
          {selectedRole === 'student' && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="text-sm font-medium text-slate-700">학생 정보</div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">학년</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
                <select
                  value={classNo}
                  onChange={(e) => setClassNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">반</option>
                  {classOptions.map(n => <option key={n} value={n}>{n}반</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  max={40}
                  placeholder="번호"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Homeroom fields */}
          {selectedRole === 'homeroom' && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="text-sm font-medium text-slate-700">담임 정보</div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">학년</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
                <select
                  value={classNo}
                  onChange={(e) => setClassNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">반</option>
                  {classOptions.map(n => <option key={n} value={n}>{n}반</option>)}
                </select>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5 leading-relaxed">
                담임교사 권한은 관리자 승인 후 활성화됩니다. 승인 전까지는 학생 권한으로 시스템을 이용할 수 있습니다.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
              <p className="text-rose-700 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '설정 중...' : '역할 설정 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}
