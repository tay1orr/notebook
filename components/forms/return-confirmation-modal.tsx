'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad'
import { formatDateTime } from '@/lib/utils'

interface ReturnConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    signature: string
    condition: string
    notes?: string
    receiverName: string
  }) => void
  loanData: any
  receiverName: string
}

export function ReturnConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loanData,
  receiverName
}: ReturnConfirmationModalProps) {
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const signaturePadRef = useRef<SignaturePadRef>(null)

  const conditions = [
    { value: 'good', label: '양호 (정상 상태)' },
    { value: 'minor_damage', label: '경미한 손상' },
    { value: 'major_damage', label: '심각한 손상' },
    { value: 'missing_parts', label: '부속품 분실' }
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!condition) {
      newErrors.condition = '기기 상태를 선택해주세요.'
    }

    if (signatureEmpty) {
      newErrors.signature = '서명을 해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleConfirm = () => {
    if (!validateForm()) {
      return
    }

    const signatureData = signaturePadRef.current?.toDataURL() || ''

    onConfirm({
      signature: signatureData,
      condition,
      notes: notes.trim() || undefined,
      receiverName
    })

    // Reset form
    setCondition('')
    setNotes('')
    setSignatureEmpty(true)
    setErrors({})
    signaturePadRef.current?.clear()
  }

  const handleClose = () => {
    setCondition('')
    setNotes('')
    setSignatureEmpty(true)
    setErrors({})
    signaturePadRef.current?.clear()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기기 반납 확인</DialogTitle>
          <DialogDescription>
            기기 상태를 확인하고 반납 처리를 완료해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 대여 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">반납 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">학생:</span>
                <span className="ml-2 font-medium">{loanData.student_name || loanData.studentName}</span>
              </div>
              <div>
                <span className="text-gray-600">학번:</span>
                <span className="ml-2">{loanData.class_name || loanData.className} {loanData.student_no || loanData.studentNo}번</span>
              </div>
              <div>
                <span className="text-gray-600">기기:</span>
                <span className="ml-2 font-medium">{loanData.device_tag || loanData.deviceTag}</span>
              </div>
              <div>
                <span className="text-gray-600">반납 예정:</span>
                <span className="ml-2">{formatDateTime(loanData.due_date || loanData.dueDate)}</span>
              </div>
              <div>
                <span className="text-gray-600">대여일:</span>
                <span className="ml-2">{formatDateTime(loanData.approved_at || loanData.approvedAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">사용 목적:</span>
                <span className="ml-2">{loanData.purpose}</span>
              </div>
            </div>
          </div>

          {/* 기기 상태 확인 */}
          <div className="space-y-2">
            <Label htmlFor="condition">기기 상태 *</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue placeholder="기기 상태를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((cond) => (
                  <SelectItem key={cond.value} value={cond.value}>
                    {cond.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.condition && <p className="text-sm text-red-500">{errors.condition}</p>}
          </div>

          {/* 특이사항 */}
          <div className="space-y-2">
            <Label htmlFor="notes">특이사항 또는 손상 내용</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="기기에 손상이나 특이사항이 있다면 자세히 기록해주세요"
              rows={3}
            />
          </div>

          {/* 담당자 서명 */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">담당자 서명</h4>
              <p className="text-sm text-blue-800 mb-4">
                위 학생으로부터 기기 <strong>{loanData.device_tag || loanData.deviceTag}</strong>을(를) 반납받아 교실 충전함에 보관했음을 확인합니다.
                <br />
                담당자: <strong>{receiverName}</strong>
              </p>

              <div className="space-y-2">
                <Label>담당자 서명 *</Label>
                <SignaturePad
                  ref={signaturePadRef}
                  width={450}
                  height={150}
                  className="w-full h-32 sm:h-36 md:h-40 border-2 border-gray-300"
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
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleConfirm}>
              반납 처리 완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}