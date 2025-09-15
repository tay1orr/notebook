import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// dayjs 플러그인 설정
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(customParseFormat)

// 한국 시간대 설정
const KST_TIMEZONE = 'Asia/Seoul'

export interface SchoolDay {
  date: string // YYYY-MM-DD 형식
  isSchoolDay: boolean
  description?: string
}

export class DateCalculator {
  private schoolCalendar: Map<string, SchoolDay> = new Map()
  private isCalendarEnabled: boolean = false

  constructor() {
    // 환경변수에서 학사력 기능 활성화 여부 확인
    this.isCalendarEnabled = process.env.FEATURE_CALENDAR_ENABLED === 'true'
  }

  /**
   * 학사력 데이터 로드
   */
  async loadSchoolCalendar(schoolDays: SchoolDay[]) {
    this.schoolCalendar.clear()
    schoolDays.forEach(day => {
      this.schoolCalendar.set(day.date, day)
    })
    this.isCalendarEnabled = true
  }

  /**
   * 현재 KST 시간 반환
   */
  getCurrentKST(): dayjs.Dayjs {
    return dayjs().tz(KST_TIMEZONE)
  }

  /**
   * 기본 다음 평일 계산 (학사력 미사용)
   */
  private getNextWeekday(date: dayjs.Dayjs): dayjs.Dayjs {
    let nextDay = date.add(1, 'day')

    // 토요일(6) 또는 일요일(0)이면 다음 월요일로
    while (nextDay.day() === 0 || nextDay.day() === 6) {
      nextDay = nextDay.add(1, 'day')
    }

    return nextDay
  }

  /**
   * 다음 등교일 계산
   * @param fromDate 기준 날짜 (기본값: 현재 KST 시간)
   * @returns 다음 등교일 (08:45 KST)
   */
  getNextSchoolDay(fromDate?: dayjs.Dayjs): dayjs.Dayjs {
    const baseDate = fromDate || this.getCurrentKST()

    if (!this.isCalendarEnabled || this.schoolCalendar.size === 0) {
      // 학사력이 비활성화되거나 데이터가 없으면 기본 평일 로직 사용
      return this.getNextWeekday(baseDate)
        .hour(8)
        .minute(45)
        .second(0)
        .millisecond(0)
    }

    // 학사력을 이용한 다음 등교일 계산
    let nextDay = baseDate.add(1, 'day')
    let attempts = 0
    const maxAttempts = 365 // 무한루프 방지

    while (attempts < maxAttempts) {
      const dateStr = nextDay.format('YYYY-MM-DD')
      const schoolDayInfo = this.schoolCalendar.get(dateStr)

      if (schoolDayInfo?.isSchoolDay) {
        // 등교일을 찾았으면 08:45로 설정하여 반환
        return nextDay
          .hour(8)
          .minute(45)
          .second(0)
          .millisecond(0)
      }

      // 학사력에 없는 날짜는 기본 평일 로직 적용
      if (!schoolDayInfo && nextDay.day() !== 0 && nextDay.day() !== 6) {
        return nextDay
          .hour(8)
          .minute(45)
          .second(0)
          .millisecond(0)
      }

      nextDay = nextDay.add(1, 'day')
      attempts++
    }

    // 최대 시도 횟수를 초과하면 기본 평일 로직으로 폴백
    console.warn('다음 등교일 계산 시 최대 시도 횟수 초과, 기본 로직 사용')
    return this.getNextWeekday(baseDate)
      .hour(8)
      .minute(45)
      .second(0)
      .millisecond(0)
  }

  /**
   * 대여 마감일 계산
   * @param requestDate 대여 신청일 (기본값: 현재 KST 시간)
   * @returns 반납 마감일시
   */
  calculateDueDate(requestDate?: dayjs.Dayjs): dayjs.Dayjs {
    return this.getNextSchoolDay(requestDate)
  }

  /**
   * 연체 여부 확인
   * @param dueDate 반납 마감일시
   * @param currentDate 현재 시간 (기본값: 현재 KST 시간)
   * @returns 연체 여부
   */
  isOverdue(dueDate: string | dayjs.Dayjs, currentDate?: dayjs.Dayjs): boolean {
    const due = typeof dueDate === 'string' ? dayjs(dueDate).tz(KST_TIMEZONE) : dueDate
    const now = currentDate || this.getCurrentKST()

    return now.isAfter(due)
  }

  /**
   * 연체 시간 계산 (시간 단위)
   * @param dueDate 반납 마감일시
   * @param currentDate 현재 시간 (기본값: 현재 KST 시간)
   * @returns 연체 시간 (음수면 아직 연체 아님)
   */
  getOverdueHours(dueDate: string | dayjs.Dayjs, currentDate?: dayjs.Dayjs): number {
    const due = typeof dueDate === 'string' ? dayjs(dueDate).tz(KST_TIMEZONE) : dueDate
    const now = currentDate || this.getCurrentKST()

    return now.diff(due, 'hour', true)
  }

  /**
   * 날짜 형식화
   */
  formatDate(date: string | dayjs.Dayjs, format: string = 'YYYY년 MM월 DD일 dddd'): string {
    const d = typeof date === 'string' ? dayjs(date).tz(KST_TIMEZONE) : date
    return d.format(format)
  }

  formatDateTime(date: string | dayjs.Dayjs, format: string = 'YYYY년 MM월 DD일 HH:mm'): string {
    const d = typeof date === 'string' ? dayjs(date).tz(KST_TIMEZONE) : date
    return d.format(format)
  }

  /**
   * 학사일정 등록/수정
   */
  setSchoolDay(date: string, isSchoolDay: boolean, description?: string) {
    this.schoolCalendar.set(date, { date, isSchoolDay, description })
  }

  /**
   * 특정 날짜의 등교 여부 확인
   */
  isSchoolDay(date: string | dayjs.Dayjs): boolean {
    const dateStr = typeof date === 'string' ? date : date.format('YYYY-MM-DD')
    const schoolDayInfo = this.schoolCalendar.get(dateStr)

    if (schoolDayInfo) {
      return schoolDayInfo.isSchoolDay
    }

    // 학사력에 없으면 기본 평일 로직
    const d = typeof date === 'string' ? dayjs(date) : date
    return d.day() !== 0 && d.day() !== 6
  }

  /**
   * ICS 파일 파싱 (간단한 구현)
   */
  parseICSFile(icsContent: string): SchoolDay[] {
    const schoolDays: SchoolDay[] = []
    const lines = icsContent.split('\n')

    let currentEvent: Partial<{ date: string; summary: string }> = {}

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (trimmedLine.startsWith('DTSTART')) {
        // DTSTART:20240916 형식에서 날짜 추출
        const dateMatch = trimmedLine.match(/DTSTART[;:]?.*?(\d{8})/)
        if (dateMatch) {
          const dateStr = dateMatch[1]
          currentEvent.date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
        }
      } else if (trimmedLine.startsWith('SUMMARY')) {
        // SUMMARY:휴업일 형식에서 제목 추출
        const summaryMatch = trimmedLine.match(/SUMMARY:(.+)/)
        if (summaryMatch) {
          currentEvent.summary = summaryMatch[1]
        }
      } else if (trimmedLine === 'END:VEVENT' && currentEvent.date) {
        // 이벤트 종료 시 학사일정에 추가
        const isHoliday = currentEvent.summary?.includes('휴업') ||
                         currentEvent.summary?.includes('휴일') ||
                         currentEvent.summary?.includes('방학')

        schoolDays.push({
          date: currentEvent.date,
          isSchoolDay: !isHoliday,
          description: currentEvent.summary
        })

        currentEvent = {}
      }
    }

    return schoolDays
  }

  /**
   * CSV 파일 파싱
   * 예상 형식: date,is_school_day,description
   */
  parseCSVFile(csvContent: string): SchoolDay[] {
    const schoolDays: SchoolDay[] = []
    const lines = csvContent.split('\n')

    // 헤더 라인 스킵
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const [date, isSchoolDayStr, description] = line.split(',').map(s => s.trim())

      if (date && isSchoolDayStr) {
        schoolDays.push({
          date,
          isSchoolDay: isSchoolDayStr.toLowerCase() === 'true' || isSchoolDayStr === '1',
          description: description || undefined
        })
      }
    }

    return schoolDays
  }
}

// 전역 인스턴스
export const dateCalculator = new DateCalculator()

// 유틸리티 함수들
export function getCurrentKST(): dayjs.Dayjs {
  return dateCalculator.getCurrentKST()
}

export function getNextSchoolDay(fromDate?: dayjs.Dayjs): dayjs.Dayjs {
  return dateCalculator.getNextSchoolDay(fromDate)
}

export function calculateDueDate(requestDate?: dayjs.Dayjs): dayjs.Dayjs {
  return dateCalculator.calculateDueDate(requestDate)
}

export function isOverdue(dueDate: string | dayjs.Dayjs): boolean {
  return dateCalculator.isOverdue(dueDate)
}

export function formatDateKST(date: string | dayjs.Dayjs, format?: string): string {
  return dateCalculator.formatDate(date, format)
}

export function formatDateTimeKST(date: string | dayjs.Dayjs, format?: string): string {
  return dateCalculator.formatDateTime(date, format)
}