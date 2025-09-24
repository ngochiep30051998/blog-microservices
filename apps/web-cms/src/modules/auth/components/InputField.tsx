import React, { useState } from 'react';

interface InputFieldProps {
  type: 'email' | 'password';
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  type,
  placeholder,
  value = '', // Default to empty string instead of undefined
  onChange,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
  };

  const getIcon = () => {
    if (type === 'email') {
      return (
        <svg
          className={`w-5 h-5 ${isFocused ? 'text-indigo-500' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      );
    } else {
      return (
        <svg
          className={`w-5 h-5 ${isFocused ? 'text-indigo-500' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {getIcon()}
      </div>
      <input
        type={type === 'password' && showPassword ? 'text' : type}
        placeholder={placeholder}
        value={value || ''} // Ensure value is never undefined
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full pl-10 ${
          type === 'password' ? 'pr-10' : 'pr-4'
        } py-3 border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg outline-none transition-colors duration-200`}
      />
      {type === 'password' && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          onClick={togglePasswordVisibility}
        >
          {showPassword ? (
            <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default InputField;