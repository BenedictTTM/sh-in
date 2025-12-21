import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthUserDto } from '../dto/oauth-user.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { name, emails, photos, id } = profile;
        const user: OAuthUserDto = {
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
            profilePic: photos[0].value,
            provider: 'google',
            providerId: id,
        };
        done(null, user);
    }
}
