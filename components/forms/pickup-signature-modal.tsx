'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from './signature-pad'
import { formatDateTime } from '@/lib/utils'

interface PickupSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (signatureData: string) => void
  loanData: {
    id: string
    studentName: string
    studentNo: string
    className: string
    deviceTag: string
    approvedAt: string
    dueDate: string
  }
}

export function PickupSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  loanData
}: PickupSignatureModalProps) {
  const [signature, setSignature] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSignature = (signatureData: string) => {
    setSignature(signatureData)
  }

  const handleConfirm = async () => {
    if (!signature) return

    setIsProcessing(true)
    try {
      await onConfirm(signature)
      onClose()
      setSignature(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setSignature(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>기기 수령 확인</DialogTitle>
          <DialogDescription>
            기기를 수령했음을 확인하기 위해 전자서명을 진행해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 대여 정보 요약 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">대여 정보</h3>
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
                <span className="text-gray-600">승인일시:</span>
                <span className="ml-2">{formatDateTime(loanData.approvedAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">반납예정:</span>
                <span className="ml-2">{formatDateTime(loanData.dueDate)}</span>
              </div>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">기기 사용 주의사항</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 기기를 분실하거나 파손한 경우 즉시 담임교사에게 신고해 주세요</li>
              <li>• 기기는 학습 목적으로만 사용하며, 게임이나 오락 목적으로 사용금지</li>
              <li>• 반납 기한을 준수해 주세요 (연체 시 향후 대여 제한)</li>
              <li>• 기기에 개인 계정 로그인 후 반드시 로그아웃 후 반납</li>
            </ul>
          </div>

          {/* 서명 영역 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">학생 서명</h4>
              {signature && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  서명 완료
                </Badge>
              )}
            </div>
            <SignaturePad
              onSignature={handleSignature}
              title="수령 확인 서명"
              description="위의 주의사항을 숙지하였으며, 기기를 수령했음을 확인합니다."
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
              {isProcessing ? '처리 중...' : '수령 완료'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}