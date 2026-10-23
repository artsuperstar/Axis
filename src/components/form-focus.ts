import { createContext, useContext } from 'react';
import type { TextInputInstance } from 'react-native';

export const FormFocusContext = createContext<{ focus: (input: TextInputInstance | null) => void; blur: (input: TextInputInstance | null) => void } | null>(null);
export const useFormFocus = () => useContext(FormFocusContext);
