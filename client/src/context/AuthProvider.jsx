
import { useCallback, useEffect, useState } from "react";
import AuthContext from "./AuthContext.jsx";
import apiRequest from "../services/api.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem("collabsphere_token"))
  );

  const logout = useCallback(() => {
    localStorage.removeItem("collabsphere_token");
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }

    window.addEventListener("collabsphere:unauthorized", handleUnauthorized);
    let active = true;

    if (localStorage.getItem("collabsphere_token")) {
      apiRequest("/auth/me")
        .then((data) => {
          if (active) setUser(data.user);
        })
        .catch((error) => {
          if (error.status === 401) {
            localStorage.removeItem("collabsphere_token");
          }
          if (active) setUser(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      window.removeEventListener(
        "collabsphere:unauthorized",
        handleUnauthorized
      );
    };
  }, [logout]);

  async function login(credentials) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    localStorage.setItem("collabsphere_token", data.token);
    setUser(data.user);
    setLoading(false);
    return data;
  }

  async function register(details) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });

    localStorage.setItem("collabsphere_token", data.token);
    setUser(data.user);
    setLoading(false);
    return data;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
