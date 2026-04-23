import { baseUrl } from "./baseUrl";
import { SWRConfig } from "swr";
import { WsProvider } from "./ws";
import axios from "axios";
import { ReactNode } from "react";
import { isRedirectingToLogin, setRedirectingToLogin } from "./auth-redirect";
import { mockAxiosAdapter, NO_ENDPOINT_MODE } from "./mockApi";

axios.defaults.baseURL = `${baseUrl}`;

if (NO_ENDPOINT_MODE) {
  axios.defaults.adapter = mockAxiosAdapter;
}

// Add request interceptor to prepend /api/ to relative paths
axios.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/')) {
    config.url = `/api/${config.url}`;
  }
  return config;
});

type ApiProviderType = {
  children?: ReactNode;
  options?: Record<string, unknown>;
};

export function ApiProvider({ children, options }: ApiProviderType) {
  axios.defaults.headers.common = {
    "X-CSRF-TOKEN": 1,
    "X-CACHE-BYPASS": 1,
  };

  return (
    <SWRConfig
      value={{
        fetcher: (key) => {
          const [path, params] = Array.isArray(key) ? key : [key, undefined];
          const apiPath = path.startsWith('/') ? path : `/api/${path}`;
          return axios.get(apiPath, { params }).then((res) => res.data);
        },
        onError: (error, _key) => {
          if (
            error.response &&
            [401, 302, 307].includes(error.response.status)
          ) {
            // redirect to the login page if not already there
            const loginPage = error.response.headers.get("location") ?? "login";
            if (window.location.href !== loginPage && !isRedirectingToLogin()) {
              setRedirectingToLogin(true);
              window.location.href = loginPage;
            }
          }
        },
        ...options,
      }}
    >
      <WsWithConfig>{children}</WsWithConfig>
    </SWRConfig>
  );
}

type WsWithConfigType = {
  children: ReactNode;
};

function WsWithConfig({ children }: WsWithConfigType) {
  return <WsProvider>{children}</WsProvider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApiHost() {
  return baseUrl;
}
