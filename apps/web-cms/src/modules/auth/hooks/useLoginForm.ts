import { useForm } from 'antd/lib/form/Form';
import { Rule } from 'antd/lib/form';

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export const useLoginForm = () => {
  const [form] = useForm<LoginFormValues>();

  const validationRules = {
    email: [
      {
        required: true,
        message: 'Please enter your email address',
      },
      {
        type: 'email' as const,
        message: 'Please enter a valid email address',
      },
    ] as Rule[],
    
    password: [
      {
        required: true,
        message: 'Please enter your password',
      },
      {
        min: 6,
        message: 'Password must be at least 6 characters',
      },
    ] as Rule[],
  };

  const validateField = async (fieldName: keyof LoginFormValues) => {
    try {
      await form.validateFields([fieldName]);
      return { isValid: true, errorMessage: '' };
    } catch (errorInfo: any) {
      const error = errorInfo.errorFields?.[0];
      return {
        isValid: false,
        errorMessage: error?.errors?.[0] || 'Validation failed',
      };
    }
  };

  const validateAllFields = async () => {
    try {
      const values = await form.validateFields();
      return { isValid: true, values, errors: {} };
    } catch (errorInfo: any) {
      const errors: Record<string, string> = {};
      errorInfo.errorFields?.forEach((field: any) => {
        errors[field.name[0]] = field.errors[0];
      });
      return { isValid: false, values: null, errors };
    }
  };

  const setFieldValue = (field: keyof LoginFormValues, value: any) => {
    form.setFieldValue(field, value);
  };

  const getFieldValue = (field: keyof LoginFormValues) => {
    return form.getFieldValue(field);
  };

  const resetFields = () => {
    form.resetFields();
  };

  return {
    form,
    validationRules,
    validateField,
    validateAllFields,
    setFieldValue,
    getFieldValue,
    resetFields,
  };
};