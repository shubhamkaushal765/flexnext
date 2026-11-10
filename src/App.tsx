import { NavLink, Outlet, createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ProfileProvider } from './state/ProfileContext';
import Home from './pages/Home';
import Profiles from './pages/Profiles';
import Modes from './pages/Modes';
import Sensors from './pages/Sensors';
import { NotFound, RouteError } from './components/RouteError';

function Layout() {
  return (
    <ProfileProvider>
      <main>
        <Outlet />
      </main>
      <nav className="bottom-nav">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/profiles">Profiles</NavLink>
        <NavLink to="/modes">Modes</NavLink>
        <NavLink to="/sensors">Sensors</NavLink>
      </nav>
    </ProfileProvider>
  );
}

const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/profiles', element: <Profiles /> },
      { path: '/modes', element: <Modes /> },
      { path: '/sensors', element: <Sensors /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
