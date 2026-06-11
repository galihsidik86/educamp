import * as React from 'react';
/** Labelled text field with optional icon, hint and error state. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  /** Helper text below the field. */
  hint?: React.ReactNode;
  /** Error message; switches the field to invalid styling. */
  error?: React.ReactNode;
  required?: boolean;
  /** Leading icon node. */
  icon?: React.ReactNode;
}
export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
