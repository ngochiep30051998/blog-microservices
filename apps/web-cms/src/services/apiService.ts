import httpService from "./httpService"

export const login = async (email: string, password: string) => {
    return httpService.post('/users/login', { identifier: email, password });
}
const apiService = {
    login,
}
export default apiService;