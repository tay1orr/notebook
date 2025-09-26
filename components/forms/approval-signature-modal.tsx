'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad'
import { formatDateTime } from '@/lib/utils'

interface ApprovalSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { signature: string; deviceTag: string; approverName: string }) => void
  loanData: any
  approverName: string
}

export function ApprovalSignatureModal({
  isOpen,
  onClose,
  onConfirm,
  loanData,
  approverName
}: ApprovalSignatureModalProps) {
  const [deviceConfirmed, setDeviceConfirmed] = useState(false)
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const signaturePadRef = useRef<SignaturePadRef>(null)

  // 신청한 기기 정보
  const requestedDevice = loanData.deviceTag || loanData.device_tag

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!deviceConfirmed) {
      newErrors.deviceConfirmed = '기기 지급 확인을 체크해주세요.'
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
      deviceTag: requestedDevice,
      approverName
    })

    // Reset form
    setDeviceConfirmed(false)
    setSignatureEmpty(true)
    setErrors({})
    signaturePadRef.current?.clear()
  }

  const handleClose = () => {
    setDeviceConfirmed(false)
    setSignatureEmpty(true)
    setErrors({})
    signaturePadRef.current?.clear()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>대여 승인 및 기기 지급</DialogTitle>
          <DialogDescription>
            학생에게 기기를 지급하고 승인 서명을 해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 승인 검토 안내 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg text-yellow-800 mb-2">📋 승인 전 검토사항</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 대여 기기 번호가 올바른지 확인</li>
              <li>• 학번(학급, 번호)이 정확히 기입되었는지 확인</li>
              <li>• 사용 목적이 적절하고 구체적인지 확인</li>
              <li>• 반납일이 적절한지 확인 (다음 등교일)</li>
              <li>• 서명이 학생 이름과 일치하는지 확인</li>
            </ul>
          </div>

          {/* 신청 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">📝 신청 정보 상세</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">👤 학생명:</span>
                <span className="font-bold">{loanData.student_name || loanData.studentName}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">🏫 학번:</span>
                <span className="font-bold">{loanData.class_name || loanData.className} {loanData.student_no || loanData.studentNo}번</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">📚 사용 목적:</span>
                <span className="font-bold text-blue-600">{loanData.purpose}</span>
              </div>
              {(loanData.purpose_detail || loanData.purposeDetail) && (
                <div className="p-2 bg-white rounded border">
                  <span className="text-gray-600 font-medium">📄 상세 목적:</span>
                  <div className="mt-1 text-blue-600 font-medium">{loanData.purpose_detail || loanData.purposeDetail}</div>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">📅 반납 예정:</span>
                <span className="font-bold text-red-600">
                  {(() => {
                    const dueDate = loanData.due_date || loanData.dueDate || loanData.return_date;
                    if (!dueDate) return '미정';
                    const date = new Date(dueDate);
                    return date.toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">📞 연락처:</span>
                <span className="font-bold">{loanData.student_contact || loanData.studentContact}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-gray-600 font-medium">🕐 신청일:</span>
                <span className="font-bold">{formatDateTime(loanData.created_at || loanData.requestedAt)}</span>
              </div>
              {loanData.signature ? (
                <div className="p-3 bg-white rounded border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-bold">✍️ 학생 서명 확인</span>
                    <span className="text-xs text-blue-600 font-medium">이름과 일치하는지 확인하세요</span>
                  </div>
                  <div className="border-2 border-gray-300 rounded-lg p-3 bg-blue-50">
                    <img
                      src={loanData.signature}
                      alt="학생 서명"
                      className="max-h-24 w-full object-contain border border-gray-200 rounded bg-white p-2"
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    👤 서명자: <strong>{loanData.student_name || loanData.studentName}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <span className="text-red-700 font-medium">⚠️ 학생 서명이 없습니다</span>
                  <div className="text-sm text-red-600 mt-1">서명 없이 승인을 진행하시겠습니까?</div>
                </div>
              )}
            </div>
          </div>

          {/* 신청한 기기 정보 */}
          {requestedDevice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg text-blue-900 mb-2">신청한 노트북</h3>
              <div className="text-lg font-bold text-blue-800">
                {requestedDevice}번 노트북
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {requestedDevice.split('-')[0]}학년 {requestedDevice.split('-')[1]}반 {requestedDevice.split('-')[2]}번
              </div>
            </div>
          )}

          {/* 기기 지급 확인 */}
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-3">기기 지급 확인</h4>
              {requestedDevice ? (
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="deviceConfirmed"
                    checked={deviceConfirmed}
                    onCheckedChange={(checked) => setDeviceConfirmed(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="deviceConfirmed" className="text-sm font-medium">
                      <strong>{requestedDevice}번 노트북</strong>을 학생에게 지급했습니다
                    </Label>
                    <p className="text-xs text-yellow-700">
                      ({requestedDevice.split('-')[0]}학년 {requestedDevice.split('-')[1]}반 {requestedDevice.split('-')[2]}번 기기 확인 완료)
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-yellow-800">기기 정보를 확인할 수 없습니다.</p>
              )}
              {errors.deviceConfirmed && <p className="text-sm text-red-500 mt-2">{errors.deviceConfirmed}</p>}
            </div>
          </div>

          {/* 도우미/관리자 서명 */}
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">담당자 서명</h4>
              <p className="text-sm text-green-800 mb-4">
                위 학생에게 기기 <strong>{requestedDevice || '[기기번호]'}</strong>를 지급했음을 확인합니다.
                <br />
                담당자: <strong>{approverName}</strong>
              </p>

              <div className="space-y-2">
                <Label>담당자 서명 *</Label>
                <div className="w-full max-w-lg mx-auto">
                  <SignaturePad
                    ref={signaturePadRef}
                    width={450}
                    height={150}
                    className="w-full h-32 sm:h-36 md:h-40 border-2 border-gray-300"
                    onSignatureChange={setSignatureEmpty}
                  />
                </div>
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
              승인 및 기기 지급 완료
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}