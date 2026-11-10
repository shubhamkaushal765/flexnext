import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { GENERIC_ERROR_MESSAGE } from '../lib/errors';

export function NotFound() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  console.error('[RouteError]', error);
  return (
    <div className="card">
      <p className="error" role="alert">{GENERIC_ERROR_MESSAGE}</p>
      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </div>
  );
}
