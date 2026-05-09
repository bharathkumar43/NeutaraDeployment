import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithAzure: (idToken: string) => Promise<void>;
  loginWithCode: (code: string, redirectUri: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccess: (feature: string) => boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  dev:    ['create_deployment', 'view_own', 'acknowledge', 'view_all'],
  qa:     ['qa_approve', 'view_all', 'create_deployment'],
  infra:  ['infra_deploy', 'view_all'],
  admin:  ['create_deployment', 'view_all', 'qa_approve', 'infra_deploy', 'acknowledge', 'manage_users', 'view_audit'],
  viewer: ['view_all'],
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authService.login(email, password);
          localStorage.setItem('neutara_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      loginWithAzure: async (idToken) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authService.azureLogin(idToken);
          localStorage.setItem('neutara_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      loginWithCode: async (code, redirectUri) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authService.exchangeAzureCode(code, redirectUri);
          localStorage.setItem('neutara_token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('neutara_token');
        localStorage.removeItem('neutara_user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasRole: (...roles) => {
        const { user } = get();
        return user ? roles.includes(user.role as UserRole) : false;
      },

      canAccess: (feature) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role as UserRole]?.includes(feature) ?? false;
      },
    }),
    { name: 'neutara_auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);
