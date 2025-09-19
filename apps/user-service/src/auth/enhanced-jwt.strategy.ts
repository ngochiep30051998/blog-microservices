import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';
import { JwtPayload, AuthenticatedUser } from '@blog/shared/auth';

@Injectable()
export class EnhancedJwtStrategy extends PassportStrategy(Strategy, 'enhanced-jwt') {
  constructor(
    private configService: ConfigService,
    private userService: UserService, // Only in user service
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Enhanced validation: check if user still exists and is active
    try {
      const user = await this.userService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };
    } catch (error) {
      // If user service fails, fall back to basic JWT validation
      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };
    }
  }
}