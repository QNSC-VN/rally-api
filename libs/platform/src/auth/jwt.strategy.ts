import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Algorithm } from 'jsonwebtoken';
import { AppConfigService } from '../config/app-config.service';

export interface JwtPayload {
  /** Subject = userId */
  sub: string;
  tenantId: string;
  sessionId: string;
  jti: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_PUBLIC_KEY'),
      algorithms: ['EdDSA', 'RS256'] as Algorithm[],
      issuer: config.get('JWT_ISSUER'),
      audience: config.get('JWT_AUDIENCE'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // Denylist check (Valkey) happens in a separate guard or here via injection
    // Returning payload attaches it to request.user
    return payload;
  }
}
