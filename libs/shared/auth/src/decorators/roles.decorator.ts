import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../lib/roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);