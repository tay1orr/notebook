'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad'
import { CalendarIcon } from 'lucide-react'
import { getCurrentKoreaTime, getCurrentKoreaDateTimeString, getReturnDateTime, isWeekend, getNextWeekday } from '@/lib/utils'

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
    notes: '',
    currentClass: '',
    currentGrade: '',
    currentClassNumber: '',
    currentStudentNumber: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const signaturePadRef = useRef<SignaturePadRef>(null)

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

    if (!formData.currentGrade) {
      newErrors.currentGrade = '학년을 선택해주세요.'
    }

    if (!formData.currentClassNumber) {
      newErrors.currentClassNumber = '반을 선택해주세요.'
    }

    if (!formData.currentStudentNumber) {
      newErrors.currentStudentNumber = '학생 번호를 입력해주세요.'
    } else {
      const studentNum = parseInt(formData.currentStudentNumber)
      if (isNaN(studentNum) || studentNum < 1 || studentNum > 35) {
        newErrors.currentStudentNumber = '1~35번 사이의 번호를 입력해주세요.'
      }
    }

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

      // 주말 선택 불가
      if (isWeekend(returnDate)) {
        newErrors.returnDate = '반납일은 평일만 선택할 수 있습니다. (토요일, 일요일 불가)'
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

    if (signatureEmpty) {
      newErrors.signature = '서명을 해주세요.'
    }

    if (!formData.studentContact.trim()) {
      newErrors.studentContact = '연락처를 입력해주세요.'
    } else {
      // 연락처 형식 검증 (010-0000-0000 또는 01000000000)
      const phoneRegex = /^010-?\d{4}-?\d{4}$/
      if (!phoneRegex.test(formData.studentContact.replace(/\s/g, ''))) {
        newErrors.studentContact = '올바른 연락처 형식으로 입력해주세요. (예: 010-1234-5678)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // 서명 데이터 가져오기
    const signatureData = signaturePadRef.current?.toDataURL() || ''

    // 학생이 입력한 정보로 기기 번호 생성
    const paddedStudentNum = formData.currentStudentNumber.padStart(2, '0')
    const currentClass = `${formData.currentGrade}-${formData.currentClassNumber}`
    const deviceNumber = `${currentClass}-${paddedStudentNum}`

    const requestData = {
      ...formData,
      studentName: studentInfo.name,
      studentNo: paddedStudentNum,
      className: currentClass,
      currentClass: currentClass,
      email: studentInfo.email,
      requestType: 'home_loan',
      status: 'requested',
      requestedAt: getCurrentKoreaDateTimeString(),
      dueDate: getReturnDateTime(formData.returnDate + 'T09:00:00'), // 반납 시간을 오전 9시로 고정
      device_tag: deviceNumber, // 수동 입력된 정보로 생성된 기기 번호
      studentSignature: signatureData
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
        notes: '',
        currentClass: '',
        currentGrade: '',
        currentClassNumber: '',
        currentStudentNumber: ''
      })
      setErrors({})
      setSignatureEmpty(true)
      signaturePadRef.current?.clear()
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
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">신청자 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 text-sm">이름:</span>
                <span className="ml-2 font-medium">{studentInfo.name}</span>
              </div>
              <div>
                <span className="text-gray-600 text-sm">이메일:</span>
                <span className="ml-2 text-sm">{studentInfo.email}</span>
              </div>
            </div>

            {/* 현재 학급 정보 입력 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentGrade">학년 *</Label>
                <Select
                  value={formData.currentGrade}
                  onValueChange={(value) => setFormData({...formData, currentGrade: value, currentClass: `${value}-${formData.currentClassNumber}`})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
                {errors.currentGrade && <p className="text-sm text-red-500">{errors.currentGrade}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentClassNumber">반 *</Label>
                <Select
                  value={formData.currentClassNumber}
                  onValueChange={(value) => setFormData({...formData, currentClassNumber: value, currentClass: `${formData.currentGrade}-${value}`})}
                  disabled={!formData.currentGrade}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="반 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 13}, (_, i) => i + 1).map(classNum => (
                      <SelectItem key={classNum} value={classNum.toString()}>
                        {classNum}반
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currentClassNumber && <p className="text-sm text-red-500">{errors.currentClassNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStudentNumber">번호 *</Label>
                <Input
                  id="currentStudentNumber"
                  type="number"
                  min="1"
                  max="35"
                  value={formData.currentStudentNumber}
                  onChange={(e) => setFormData({...formData, currentStudentNumber: e.target.value})}
                  placeholder="예: 15"
                />
                {errors.currentStudentNumber && <p className="text-sm text-red-500">{errors.currentStudentNumber}</p>}
              </div>
            </div>

            {formData.currentGrade && formData.currentClassNumber && formData.currentStudentNumber && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                대여 기기: <strong>{formData.currentGrade}-{formData.currentClassNumber}-{formData.currentStudentNumber.padStart(2, '0')}</strong>번 노트북
              </div>
            )}
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

          {/* 학생 서명 */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">학생 서명</h4>
              <p className="text-sm text-blue-800 mb-4">
                위 신청 내용이 정확하며, 안내사항을 준수할 것을 약속합니다.
                아래에 본인의 이름을 자필로 서명해주세요.
              </p>

              <div className="space-y-2">
                <Label>자필 서명 *</Label>
                <SignaturePad
                  ref={signaturePadRef}
                  width={400}
                  height={120}
                  className="w-full"
                  onSignatureChange={setSignatureEmpty}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      signaturePadRef.current?.clear()
                      setSignatureEmpty(true)
                    }}
                  >
                    서명 지우기
                  </Button>
                </div>
                {errors.signature && <p className="text-sm text-red-500">{errors.signature}</p>}
              </div>
            </div>
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