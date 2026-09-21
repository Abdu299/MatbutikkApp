import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

type UserRole = "admin" | "user" | null;

type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  async function loadUserProfile(
    firebaseUser: User
  ) {
    try {
      const userReference = doc(
        db,
        "users",
        firebaseUser.uid
      );

      const userSnapshot = await getDoc(userReference);

      if (!userSnapshot.exists()) {
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          name: firebaseUser.displayName ?? "Bruker",
          role: "user",
        });

        return;
      }

      const userData = userSnapshot.data();

      const userRole: UserRole =
        userData.role === "admin"
          ? "admin"
          : "user";

      setUserProfile({
        uid: firebaseUser.uid,
        email:
          userData.email ??
          firebaseUser.email ??
          "",
        name:
          userData.name ??
          firebaseUser.displayName ??
          "Bruker",
        role: userRole,
      });
    } catch (error) {
      console.error(
        "Feil ved henting av brukerprofil:",
        error
      );

      setUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? "",
        name: firebaseUser.displayName ?? "Bruker",
        role: "user",
      });
    }
  }

  async function refreshUserProfile() {
    if (!user) {
      setUserProfile(null);
      return;
    }

    await loadUserProfile(user);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setIsLoading(true);
        setUser(firebaseUser);

        if (!firebaseUser) {
          setUserProfile(null);
          setIsLoading(false);
          return;
        }

        await loadUserProfile(firebaseUser);

        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const role = userProfile?.role ?? null;

  const value: AuthContextType = {
    user,
    userProfile,
    role,
    isAdmin: role === "admin",
    isAuthenticated: user !== null,
    isLoading,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth må brukes inne i AuthProvider."
    );
  }

  return context;
}