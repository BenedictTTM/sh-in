import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/modules/auth/auth.controller';
import { SignUpDto } from '../src/modules/auth/dto/signUp.dto';
import { LoginDto } from '../src/modules/auth/dto/login.dto';

async function bootstrap() {
    console.log('--- Starting Auth Test ---');

    // Create application context (no HTTP server)
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

    try {
        const authController = app.get(AuthController);

        // Generate unique user data
        const timestamp = Date.now();
        const email = `test_user_${timestamp}@example.com`;
        const password = 'TestPassword123!';
        const firstName = 'Test';
        const lastName = 'User';

        console.log(`\n1. Testing Signup for: ${email}`);
        const signUpDto: SignUpDto = {
            email,
            password,
            firstName,
            lastName,
        };

        const signupResult = await authController.signup(signUpDto);
        if (signupResult && signupResult.access_token) {
            console.log('✅ Signup successful. Access Token received.');
        } else {
            console.warn('⚠️ Signup returned unexpected result:', signupResult);
        }

        console.log(`\n2. Testing Login for: ${email}`);
        const loginDto: LoginDto = {
            email,
            password,
        };

        const loginResult = await authController.login(loginDto);
        if (loginResult && loginResult.access_token) {
            console.log('✅ Login successful. Access Token received.');
        } else {
            console.error('❌ Login failed or no token returned:', loginResult);
            throw new Error('Login failed');
        }

        console.log('\n--- ✅ Auth Test Passed ---');

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
