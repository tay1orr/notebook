// Legacy error page for Vercel compatibility
// This file exists only to suppress Vercel warnings
// Actual error handling is done in app/not-found.tsx and app/global-error.tsx

function Error({ statusCode }) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on server`
        : 'An error occurred on client'}
    </p>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error