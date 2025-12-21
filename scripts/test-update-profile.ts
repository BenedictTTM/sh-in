import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/modules/auth/auth.controller';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { SignUpDto } from '../src/modules/auth/dto/signUp.dto';
import { UpdateProfileDto } from '../src/modules/users/dto/update-profile.dto';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    console.log('--- Starting Profile Update Test ---');

    console.log('1. Bootstrapping App...');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

    try {
        const authController = app.get(AuthController);
        const usersController = app.get(UsersController);
        const usersService = app.get(UsersService);

        // Generate unique user data
        const timestamp = Date.now();
        const email = `update_test_${timestamp}@example.com`;
        const password = 'TestPassword123!';
        const firstName = 'Original';
        const lastName = 'Name';

        console.log(`\n2. Creating User: ${email}`);
        const signUpDto: SignUpDto = {
            email,
            password,
            firstName,
            lastName,
        };

        await authController.signup(signUpDto);

        // Find user to get ID
        console.log('3. Fetching User ID...');
        // We can cheat and use prisma directly or get it via login, but querying via service is cleaner if method exists
        // UsersService has getUserProfile but it needs ID. 
        // Let's use Prisma directly from the service context if possible or just rely on a helper if available.
        // Or assume we can login and decode token? No that's complex for a script.
        // Let's just use the prisma service available in the app module context?
        // Actually UsersService has prisma injected. 
        // Let's rely on a known fact: we just signed up.
        // The UsersService doesn't have a findByEmail exposed?
        // Let's iterate or just adding a temporary find to the script?
        // Ah, I can import PrismaService.
        const prisma = app.get(PrismaService);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw new Error('User creation failed, could not find user in DB.');
        }
        console.log(`   User ID: ${user.id}`);

        // Update Profile
        console.log('\n4. Updating Profile...');
        const updateDto: UpdateProfileDto = {
            firstName: 'Updated',
            lastName: 'User',
            school: 'Test University',
            profilePicture: 'https://example.com/new-pic.jpg',
        };

        const req = { user: { id: user.id } };
        const updatedProfile = await usersController.updateProfile(req, updateDto);

        console.log('   Result:', updatedProfile);

        // Verify
        if (
            updatedProfile.name === 'Updated User' &&
            updatedProfile.school === 'Test University' &&
            updatedProfile.profilePicture === 'https://example.com/new-pic.jpg'
        ) {
            console.log('\n✅ Profile Update Verified Successfully!');
        } else {
            console.error('\n❌ Verification Failed: Returned profile does not match expected values.');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
