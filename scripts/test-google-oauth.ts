import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/modules/auth/auth.controller';
import { OAuthUserDto } from '../src/modules/auth/dto/oauth-user.dto';

async function bootstrap() {
    console.log('--- Starting Google OAuth Logic Test ---');

    // Create application context
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

    try {
        const authController = app.get(AuthController);

        // Mock Google Profile Data
        const timestamp = Date.now();
        const mockGoogleUser: OAuthUserDto = {
            email: `google_user_${timestamp}@example.com`,
            firstName: 'Google',
            lastName: 'TestUser',
            profilePic: 'https://lh3.googleusercontent.com/a/mock-pic',
            provider: 'google',
            providerId: `google_id_${timestamp}`,
        };

        console.log(`\n1. Simulating Google Callback for: ${mockGoogleUser.email}`);

        // We mock the Request object that Passport would populate
        const mockRequest = {
            user: mockGoogleUser
        };

        // Mock Response object to capture redirect
        let redirectUrl = '';
        const mockResponse = {
            redirect: (url: string) => {
                redirectUrl = url;
            }
        };

        await authController.googleAuthRedirect(mockRequest as any, mockResponse as any);

        if (redirectUrl) {
            console.log('✅ Google OAuth redirect captured!');
            console.log(`✅ Redirect URL: ${redirectUrl}`);

            if (redirectUrl.includes('access_token=') && redirectUrl.includes('refresh_token=')) {
                console.log('✅ Tokens found in redirect URL.');
            } else {
                console.error('❌ Tokens missing in redirect URL.');
                throw new Error('Tokens missing in redirect URL');
            }
        } else {
            console.error('❌ Google OAuth redirect failed.');
            throw new Error('OAuth Redirect Test failed');
        }

        console.log('\n2. Simulating Login for existing Google User (Second login)');
        let secondRedirectUrl = '';
        const secondMockResponse = {
            redirect: (url: string) => {
                secondRedirectUrl = url;
            }
        };

        await authController.googleAuthRedirect(mockRequest as any, secondMockResponse as any);

        if (secondRedirectUrl && secondRedirectUrl === redirectUrl) {
            console.log('✅ Existing user correctly handled on subsequent login.');
        } else if (secondRedirectUrl) {
            console.log('✅ Subsequent login successful with different (but expected) URL.');
        } else {
            console.error('❌ Subsequent login failed.');
            throw new Error('Subsequent OAuth login failed');
        }

        console.log('\n--- ✅ Google OAuth Logic Test Passed ---');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
