export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export const getJwtConfig = (): JwtConfig => ({
  secret: process.env["JWT_SECRET"] || 'fallback-secret-key',
  expiresIn: process.env["JWT_expiresIn"] || '24h',
});