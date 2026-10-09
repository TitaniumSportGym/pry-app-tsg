import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

interface PasswordRecoveryContextValue {
  email: string | null;
  otp: string | null;
  beginRecovery: (email: string) => void;
  confirmCode: (otp: string) => void;
  clearRecovery: () => void;
}

const PasswordRecoveryContext = createContext<PasswordRecoveryContextValue | null>(null);

export function PasswordRecoveryProvider({ children }: PropsWithChildren) {
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      email,
      otp,
      beginRecovery(nextEmail: string) {
        setEmail(nextEmail);
        setOtp(null);
      },
      confirmCode(nextOtp: string) {
        setOtp(nextOtp);
      },
      clearRecovery() {
        setEmail(null);
        setOtp(null);
      },
    }),
    [email, otp],
  );

  return (
    <PasswordRecoveryContext.Provider value={value}>{children}</PasswordRecoveryContext.Provider>
  );
}

export function usePasswordRecovery() {
  const context = useContext(PasswordRecoveryContext);

  if (!context) {
    throw new Error('usePasswordRecovery debe utilizarse dentro de PasswordRecoveryProvider.');
  }

  return context;
}
