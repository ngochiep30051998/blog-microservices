import React, { useState } from 'react';
import { Form, message } from 'antd';
import LoginIllustration from '../../components/LoginIllustration';
import SocialLoginButton from '../../components/SocialLoginButton';
import InputField from '../../components/InputField';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const [form] = Form.useForm();
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Login logic will be implemented later
      console.log('Login attempt:', { ...values, rememberMe });
      message.success('Login successful!');
      // Reset form after successful login
      form.resetFields();
      setRememberMe(false);
    } catch (error) {
      console.error('Login error:', error);
      message.error('Login failed. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    // Social login logic will be implemented later
    console.log(`${provider} login attempt`);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:block lg:w-1/2">
        <LoginIllustration />
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8 bg-white rounded-3xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to
            </h2>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Design School
            </h1>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-4">
            <SocialLoginButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
            />
            <SocialLoginButton
              provider="facebook"
              onClick={() => handleSocialLogin('facebook')}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Login Form */}
          <Form 
            form={form} 
            onFinish={handleLogin} 
            layout="vertical"
            initialValues={{
              email: '',
              password: ''
            }}
          >
            <Form.Item
              name="email"
              label={<span className="text-sm font-medium text-gray-700">Email</span>}
              rules={[
                { required: true, message: 'Please enter your email address' },
                { type: 'email', message: 'Please enter a valid email address' }
              ]}
            >
              <InputField
                type="email"
                placeholder="example@gmail.com"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-sm font-medium text-gray-700">Password</span>}
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <InputField
                type="password"
                placeholder="••••••••••"
              />
            </Form.Item>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Login Button */}
            <Form.Item>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </Form.Item>
          </Form>

          {/* Register link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a
                href="#"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
              >
                Register
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}