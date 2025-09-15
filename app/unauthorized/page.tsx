import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'

export default async function UnauthorizedPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              접근 권한이 없습니다
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {user ? (
                <>
                  안녕하세요, <strong>{user.name}</strong>님<br />
                  현재 계정 (<strong>{user.email}</strong>)의 역할은 <strong>{user.role}</strong>입니다.<br />
                  이 페이지에 접근할 권한이 없습니다.
                </>
              ) : (
                '로그인이 필요하거나 권한이 없습니다.'
              )}
            </p>
          </div>

          <div className="mt-6">
            {user ? (
              <div className="space-y-3">
                {user.role === 'student' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-700">
                      학생 계정으로는 제한된 기능만 이용할 수 있습니다.<br />
                      담임교사 또는 노트북 도우미에게 문의하세요.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-700">
                      계정 설정에 문제가 있을 수 있습니다.<br />
                      시스템 관리자에게 문의하세요.
                    </p>
                  </div>
                )}

                <Link
                  href="/dashboard"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  대시보드로 돌아가기
                </Link>

                <Link
                  href="/auth"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  다른 계정으로 로그인
                </Link>
              </div>
            ) : (
              <Link
                href="/auth"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                로그인하기
              </Link>
            )}
          </div>

          <div className="mt-6">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                문의사항: <a href="mailto:notebook@ichungjungsan.kr" className="text-indigo-600 hover:underline">notebook@ichungjungsan.kr</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}