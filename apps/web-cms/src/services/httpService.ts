import axios from 'axios';

const httpInstance = axios.create({
  baseURL: `${import.meta.env.VITE_PUBLIC_API_GATEWAY_URL}/api/v1`,
})

httpInstance.interceptors.response.use(
  (res) => {
    console.log('✅interceptors Response: ', JSON.stringify(res));
    return res.data;
  },
  (error) => {
    console.error('🎯interceptors error: ', JSON.stringify(error));
    // Handle 401 unauthorized
    if (error.response && error.response.status === 401) {
      console.warn('🚨 Session expired - emitting event to parent');
    }
    throw error;
  }
)
const getHttpInstance = () => httpInstance;
const httpService = {
  getHttpInstance,
  get: getHttpInstance().get,
  post: getHttpInstance().post,
  put: getHttpInstance().put,
  patch: getHttpInstance().patch,
  delete: getHttpInstance().delete,
}


export default httpService;
