import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-12">
          <h1 className="text-6xl font-bold text-slate-100 mb-4">404</h1>
          <h2 className="text-2xl font-light text-slate-200 mb-4">Event Not Found</h2>
          <p className="text-slate-400 mb-8">
            The event you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/events"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
