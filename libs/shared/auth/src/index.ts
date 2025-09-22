export * from './lib/jwt.strategy';
export * from './lib/jwt-auth.guard';
export * from './lib/roles.guard';
export * from './decorators/roles.decorator';
export * from './lib/auth.module';

// Re-export for convenience
export { RolesGuard } from './lib/roles.guard';
export { Roles } from './decorators/roles.decorator';
export { UserRole } from './lib/roles.guard';