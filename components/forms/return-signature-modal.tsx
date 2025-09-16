'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad } from './signature-pad'
import { formatDateTime } from '@/lib/utils'

interface ReturnSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    signatureData: string
    condition: string
    notes?: string
    damages: string[]
  }) => void
  loanData: {
    id: string
    studentName: string
    studentNo: string
    className: string
    deviceTag: string
    pickedUpAt: string
    dueDate: string
  }
}

export function ReturnSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  loanData
}: ReturnSignatureModalProps) {
  const [signature, setSignature] = useState<string | null>(null)
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [damages, setDamages] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const damageOptions = [
    { id: 'screen', label: '화면 손상' },
    { id: 'keyboard', label: '키보드 손상' },
    { id: 'trackpad', label: '트랙패드 손상' },
    { id: 'ports', label: '포트 손상' },
    { id: 'battery', label: '배터리 문제' },
    { id: 'body', label: '외관 손상' },
    { id: 'other', label: '기타' }
  ]

  const handleSignature = (signatureData: string) => {
    setSignature(signatureData)
  }

  const handleDamageChange = (damageId: string, checked: boolean) => {
    if (checked) {
      setDamages([...damages, damageId])
    } else {
      setDamages(damages.filter(d => d !== damageId))
    }
  }

  const handleConfirm = async () => {
    if (!signature) return

    setIsProcessing(true)
    try {
      await onConfirm({
        signatureData: signature,
        condition,
        notes,
        damages
      })
      onClose()
      resetForm()
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSignature(null)
    setCondition('good')
    setNotes('')
    setDamages([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isOverdue = new Date(loanData.dueDate) < new Date()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기기 반납 확인</DialogTitle>
          <DialogDescription>
            기기 상태를 점검하고 반납을 완료해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 대여 정보 요약 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">반납 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">학생:</span>
                <span className="ml-2 font-medium">
                  {loanData.studentName} ({loanData.className} {loanData.studentNo}번)
                </span>
              </div>
              <div>
                <span className="text-gray-600">기기:</span>
                <span className="ml-2 font-medium">{loanData.deviceTag}</span>
              </div>
              <div>
                <span className="text-gray-600">수령일시:</span>
                <span className="ml-2">{formatDateTime(loanData.pickedUpAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">반납예정:</span>
                <span className={`ml-2 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  {formatDateTime(loanData.dueDate)}
                  {isOverdue && ' (연체)'}
                </span>
              </div>
            </div>
          </div>

          {/* 연체 경고 */}
          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">연체 알림</h4>
              <p className="text-sm text-red-800">
                반납 기한이 지났습니다. 연체 사유를 비고란에 기록해 주세요.
              </p>
            </div>
          )}

          {/* 기기 상태 점검 */}
          <div className="space-y-4">
            <h4 className="font-medium">기기 상태 점검</h4>

            <div className="space-y-3">
              <Label>전체적인 상태</Label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="good"
                    checked={condition === 'good'}
                    onChange={(e) => setCondition(e.target.value)}
                    className="text-green-600"
                  />
                  <span className="text-green-600">양호</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="fair"
                    checked={condition === 'fair'}
                    onChange={(e) => setCondition(e.target.value)}
                    className="text-yellow-600"
                  />
                  <span className="text-yellow-600">보통</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="damaged"
                    checked={condition === 'damaged'}
                    onChange={(e) => setCondition(e.target.value)}
                    className="text-red-600"
                  />
                  <span className="text-red-600">손상</span>
                </label>
              </div>
            </div>

            {/* 손상 항목 체크 */}
            {condition === 'damaged' && (
              <div className="space-y-3">
                <Label>손상 항목 (해당하는 모든 항목 선택)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {damageOptions.map((option) => (
                    <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={damages.includes(option.id)}
                        onCheckedChange={(checked) =>
                          handleDamageChange(option.id, checked as boolean)
                        }
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 비고 */}
            <div className="space-y-2">
              <Label>비고 (선택사항)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="추가 사항이나 특이사항을 기록해 주세요..."
                rows={3}
              />
            </div>
          </div>

          {/* 서명 영역 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">확인자 서명</h4>
              {signature && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  서명 완료
                </Badge>
              )}
            </div>
            <SignaturePad
              onSignature={handleSignature}
              title="반납 확인 서명"
              description="기기 상태를 점검하였으며, 반납을 확인합니다."
            />
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              취소
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!signature || isProcessing}
            >
              {isProcessing ? '처리 중...' : '반납 완료'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}