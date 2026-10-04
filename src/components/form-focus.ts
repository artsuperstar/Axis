import { createContext, useContext } from 'react';
import type { TextInput } from 'react-native';

export const FormFocusContext = createContext<{ focus: (input: TextInput | null) => void; blur: (input: TextInput | null) => void } | null>(null);
export const useFormFocus = () => useContext(FormFocusContext);
