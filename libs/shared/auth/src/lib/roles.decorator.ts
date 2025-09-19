import { SetMetadata } from '@nestjs/common';
import { UserRole } from './roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);