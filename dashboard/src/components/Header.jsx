import { Link, NavLink } from "react-router-dom";

export default function Header() {
  const linkBase = "px-3 py-2 rounded-xl text-sm hover:bg-gray-100 transition";
  const linkActive = "bg-gray-900 text-white hover:bg-gray-900";
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold tracking-tight">
          Yossi Record Dashboard
        </Link>
        <nav className="flex gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : "text-gray-700"}`
            }
          >
            דף הבית
          </NavLink>
          <NavLink
            to="/session"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : "text-gray-700"}`
            }
          >
            הקלטה חיה
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
