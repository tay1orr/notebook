'use client'

import { Button } from '@/components/ui/button'

export function ClearStorageButton() {
  const clearData = () => {
    if (confirm('정말로 모든 대여 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('loanApplications')
      alert('✅ 모든 대여 데이터가 삭제되었습니다.')
      window.location.reload()
    }
  }

  const showData = () => {
    const data = localStorage.getItem('loanApplications')
    console.log('localStorage 원본 데이터:', data)
    console.log('localStorage 모든 키:', Object.keys(localStorage))

    if (data) {
      try {
        const loans = JSON.parse(data)
        console.log('현재 저장된 대여 데이터:', loans)
        alert(`현재 ${loans.length}개의 대여 데이터가 있습니다. 콘솔을 확인하세요.`)
      } catch (error) {
        console.error('JSON 파싱 오류:', error)
        alert('데이터 파싱 중 오류가 발생했습니다.')
      }
    } else {
      alert('저장된 대여 데이터가 없습니다.')
    }
  }

  // 디버깅용으로 모든 환경에서 표시

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      <Button
        onClick={showData}
        variant="outline"
        size="sm"
        className="bg-blue-100 hover:bg-blue-200"
      >
        데이터 확인
      </Button>
      <Button
        onClick={clearData}
        variant="destructive"
        size="sm"
      >
        데이터 삭제
      </Button>
    </div>
  )
}