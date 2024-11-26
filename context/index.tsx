// context/TokenContext.tsx

import { AxiosResponse } from "axios";
import useAxios, { RefetchFunction } from "axios-hooks";
import React, { createContext, ReactNode, useContext } from "react";
import { SessionContext } from "./SessionContext"; // Import SessionContext

interface AppContextProps {
  token: string | null;
  loading: boolean;
  error: any;
  refetchToken: RefetchFunction<any, any>;
}

export const AppContext = createContext<AppContextProps>({
  token: null,
  loading: false,
  error: null,
  refetchToken: () =>
    Promise.resolve({
      data: null,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
      request: {},
    } as AxiosResponse<any>),
});

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { session } = useContext(SessionContext);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [{ data: token, loading, error }, refetchToken] = useAxios(
    {
      url: `https://${process.env.EXPO_PUBLIC_API_URL}/api/generateToken`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      data: {
        timezone,
      },
    },
    { manual: false } // Executes immediately
  );

  return (
    <AppContext.Provider value={{ token, loading, error, refetchToken }}>
      {children}
    </AppContext.Provider>
  );
};
