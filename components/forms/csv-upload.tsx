'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface CSVUploadProps {
  type: 'devices' | 'students'
  onUpload: (data: any[]) => void
  isUploading: boolean
}

export function CSVUpload({ type, onUpload, isUploading }: CSVUploadProps) {
  const [csvData, setCsvData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isValidated, setIsValidated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const deviceColumns = [
    'assetTag', 'model', 'serial', 'status', 'assignedClass', 'notes'
  ]

  const studentColumns = [
    'studentNo', 'name', 'className', 'email', 'phone', 'parentPhone'
  ]

  const expectedColumns = type === 'devices' ? deviceColumns : studentColumns

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErrors(['CSV 파일만 업로드 가능합니다.'])
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      setErrors(['CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다.'])
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })

    validateData(headers, rows)
  }

  const validateData = (headers: string[], rows: any[]) => {
    const newErrors: string[] = []

    // 헤더 검증
    const missingColumns = expectedColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      newErrors.push(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`)
    }

    // 데이터 검증
    if (type === 'devices') {
      rows.forEach((row, index) => {
        if (!row.assetTag) {
          newErrors.push(`${index + 2}행: 자산번호가 필요합니다.`)
        }
        if (!row.model) {
          newErrors.push(`${index + 2}행: 모델명이 필요합니다.`)
        }
        if (!row.serial) {
          newErrors.push(`${index + 2}행: 시리얼번호가 필요합니다.`)
        }
        if (row.status && !['available', 'loaned', 'maintenance', 'retired'].includes(row.status)) {
          newErrors.push(`${index + 2}행: 올바르지 않은 상태값입니다. (available, loaned, maintenance, retired 중 선택)`)
        }
      })
    } else if (type === 'students') {
      rows.forEach((row, index) => {
        if (!row.studentNo) {
          newErrors.push(`${index + 2}행: 학번이 필요합니다.`)
        }
        if (!row.name) {
          newErrors.push(`${index + 2}행: 이름이 필요합니다.`)
        }
        if (!row.className) {
          newErrors.push(`${index + 2}행: 학급이 필요합니다.`)
        }
        if (row.email && !row.email.includes('@')) {
          newErrors.push(`${index + 2}행: 올바르지 않은 이메일 형식입니다.`)
        }
      })
    }

    setErrors(newErrors)
    setIsValidated(newErrors.length === 0)
    setCsvData(newErrors.length === 0 ? rows : [])
  }

  const handleUpload = () => {
    if (isValidated && csvData.length > 0) {
      onUpload(csvData)
    }
  }

  const handleClear = () => {
    setCsvData([])
    setErrors([])
    setIsValidated(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const headers = expectedColumns.join(',')
    const sampleData = type === 'devices'
      ? 'NB-2024-001,LG gram 16,LG24001001,available,1-1,양호한 상태'
      : '10101,김학생,1-1,student@gclass.ice.go.kr,010-1234-5678,010-9876-5432'

    const csv = headers + '\n' + sampleData
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${type}_template.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>CSV 데이터 업로드</CardTitle>
        <CardDescription>
          {type === 'devices' ? '기기 정보를' : '학생 정보를'} CSV 파일로 일괄 업로드할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 템플릿 다운로드 */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <h4 className="font-medium text-blue-900">CSV 템플릿</h4>
            <p className="text-sm text-blue-700">
              올바른 형식의 CSV 템플릿을 다운로드하여 사용하세요.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            템플릿 다운로드
          </Button>
        </div>

        {/* 필수 컬럼 안내 */}
        <div className="space-y-2">
          <h4 className="font-medium">필수 컬럼</h4>
          <div className="flex flex-wrap gap-2">
            {expectedColumns.map((col) => (
              <Badge key={col} variant="outline">
                {col}
              </Badge>
            ))}
          </div>
        </div>

        {/* 파일 선택 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              CSV 파일 선택
            </Button>
            {csvData.length > 0 && (
              <Button variant="ghost" onClick={handleClear} disabled={isUploading}>
                초기화
              </Button>
            )}
          </div>
        </div>

        {/* 오류 표시 */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>데이터 검증 오류</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 성공 메시지 */}
        {isValidated && csvData.length > 0 && (
          <Alert>
            <AlertTitle>검증 완료</AlertTitle>
            <AlertDescription>
              {csvData.length}개의 레코드가 성공적으로 검증되었습니다. 업로드를 진행하세요.
            </AlertDescription>
          </Alert>
        )}

        {/* 데이터 미리보기 */}
        {csvData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">데이터 미리보기 (최대 5행)</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {expectedColumns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {expectedColumns.map((col) => (
                        <TableCell key={col} className="max-w-32 truncate">
                          {row[col] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvData.length > 5 && (
              <p className="text-sm text-muted-foreground">
                총 {csvData.length}개 중 5개만 미리보기로 표시됩니다.
              </p>
            )}
          </div>
        )}

        {/* 업로드 버튼 */}
        {isValidated && csvData.length > 0 && (
          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="min-w-32"
            >
              {isUploading ? '업로드 중...' : `${csvData.length}개 레코드 업로드`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}