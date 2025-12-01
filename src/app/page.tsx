import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          블로그 자동화 시스템
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
          브랜드 블로그 원고 관리 및 컨펌 시스템
        </p>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          관리자 페이지로 이동
          <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
