'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'

interface HomeLoanRequestFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (requestData: any) => void
  isSubmitting: boolean
  studentInfo: {
    name: string
    studentNo: string
    className: string
    email: string
  }
}

export function HomeLoanRequestForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  studentInfo
}: HomeLoanRequestFormProps) {
  const [formData, setFormData] = useState({
    purpose: '',
    purposeDetail: '',
    returnDate: '',
    rulesAgreed: false,
    studentContact: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const purposes = [
    { value: 'homework', label: '과제 작성' },
    { value: 'report', label: '보고서 준비' },
    { value: 'research', label: '조사 활동' },
    { value: 'presentation', label: '발표 준비' },
    { value: 'project', label: '프로젝트 작업' },
    { value: 'exam_prep', label: '시험 준비' },
    { value: 'other', label: '기타' }
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.purpose) {
      newErrors.purpose = '사용 목적을 선택해주세요.'
    }

    if (!formData.purposeDetail.trim()) {
      newErrors.purposeDetail = '상세 사용 목적을 입력해주세요.'
    }

    if (!formData.returnDate) {
      newErrors.returnDate = '반납 예정일을 선택해주세요.'
    } else {
      const today = new Date()
      const returnDate = new Date(formData.returnDate)

      if (returnDate <= today) {
        newErrors.returnDate = '반납 예정일은 내일 이후로 선택해주세요.'
      }

      // 최대 7일까지만 허용 (다음 주 금요일까지)
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 7)
      if (returnDate > maxDate) {
        newErrors.returnDate = '가정대여는 다음 등교일까지만 가능합니다.'
      }
    }

    if (!formData.rulesAgreed) {
      newErrors.rulesAgreed = '안내사항에 동의해주세요.'
    }

    if (!formData.studentContact.trim()) {
      newErrors.studentContact = '연락처를 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const requestData = {
      ...formData,
      studentName: studentInfo.name,
      studentNo: studentInfo.studentNo,
      className: studentInfo.className,
      email: studentInfo.email,
      requestType: 'home_loan',
      status: 'requested',
      requestedAt: new Date().toISOString()
    }

    onSubmit(requestData)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        purpose: '',
        purposeDetail: '',
        returnDate: '',
        rulesAgreed: false,
        studentContact: '',
        notes: ''
      })
      setErrors({})
      onClose()
    }
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>가정대여 신청</DialogTitle>
          <DialogDescription>
            노트북 가정대여를 위한 신청서를 작성해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 신청자 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">신청자 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">이름:</span>
                <span className="ml-2 font-medium">{studentInfo.name}</span>
              </div>
              <div>
                <span className="text-gray-600">학번:</span>
                <span className="ml-2">{studentInfo.studentNo}</span>
              </div>
              <div>
                <span className="text-gray-600">학급:</span>
                <span className="ml-2">{studentInfo.className}</span>
              </div>
              <div>
                <span className="text-gray-600">이메일:</span>
                <span className="ml-2">{studentInfo.email}</span>
              </div>
            </div>
          </div>

          {/* 사용 목적 */}
          <div className="space-y-2">
            <Label htmlFor="purpose">사용 목적 *</Label>
            <Select value={formData.purpose} onValueChange={(value) => setFormData({ ...formData, purpose: value })}>
              <SelectTrigger>
                <SelectValue placeholder="사용 목적을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {purposes.map((purpose) => (
                  <SelectItem key={purpose.value} value={purpose.value}>
                    {purpose.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
          </div>

          {/* 상세 사용 목적 */}
          <div className="space-y-2">
            <Label htmlFor="purposeDetail">상세 사용 목적 *</Label>
            <Textarea
              id="purposeDetail"
              value={formData.purposeDetail}
              onChange={(e) => setFormData({ ...formData, purposeDetail: e.target.value })}
              placeholder="구체적인 사용 목적을 입력해주세요 (예: 국어 독서감상문 작성, 과학 실험 보고서 준비 등)"
              rows={3}
            />
            {errors.purposeDetail && <p className="text-sm text-red-500">{errors.purposeDetail}</p>}
          </div>

          {/* 반납 예정일 */}
          <div className="space-y-2">
            <Label htmlFor="returnDate">반납 예정일 *</Label>
            <Input
              id="returnDate"
              type="date"
              value={formData.returnDate}
              onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              min={getTomorrowDate()}
              max={getMaxDate()}
            />
            {errors.returnDate && <p className="text-sm text-red-500">{errors.returnDate}</p>}
            <p className="text-xs text-gray-500">
              * 다음 등교일까지 반납이 원칙입니다
            </p>
          </div>

          {/* 학생 연락처 */}
          <div className="space-y-2">
            <Label htmlFor="studentContact">본인 연락처 *</Label>
            <Input
              id="studentContact"
              value={formData.studentContact}
              onChange={(e) => setFormData({ ...formData, studentContact: e.target.value })}
              placeholder="본인 연락처를 입력하세요 (예: 010-1234-5678)"
            />
            {errors.studentContact && <p className="text-sm text-red-500">{errors.studentContact}</p>}
          </div>

          {/* 추가 사항 */}
          <div className="space-y-2">
            <Label htmlFor="notes">추가 사항</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="기타 전달할 내용이 있다면 입력해주세요"
              rows={2}
            />
          </div>

          {/* 안내사항 확인 */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">가정대여 안내사항</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 노트북은 학습 목적으로만 사용해야 합니다</li>
                <li>• 게임, 오락 목적의 사용은 금지됩니다</li>
                <li>• 분실 또는 파손 시 즉시 학교에 신고해야 합니다</li>
                <li>• 반납 기한을 반드시 준수해야 합니다 (다음 등교일)</li>
                <li>• 다른 사람에게 대여하거나 양도할 수 없습니다</li>
                <li>• 노트북 분실 시 변상 책임이 있습니다</li>
              </ul>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="rulesAgreed"
                checked={formData.rulesAgreed}
                onCheckedChange={(checked) => setFormData({ ...formData, rulesAgreed: checked as boolean })}
              />
              <div className="space-y-1">
                <Label htmlFor="rulesAgreed" className="text-sm font-medium">
                  안내사항 확인 및 준수 동의 *
                </Label>
                <p className="text-xs text-gray-600">
                  위 안내사항을 모두 읽었으며, 이를 준수할 것을 약속합니다.
                </p>
              </div>
            </div>
            {errors.rulesAgreed && <p className="text-sm text-red-500">{errors.rulesAgreed}</p>}
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '신청 중...' : '대여 신청'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}