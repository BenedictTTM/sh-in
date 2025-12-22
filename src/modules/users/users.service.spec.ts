import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import type { Express } from 'express';

jest.mock('cloudinary', () => ({
    v2: {
        uploader: {
            upload_stream: jest.fn(),
        },
    },
}));

describe('UsersService', () => {
    let service: UsersService;
    let prisma: PrismaService;

    const mockPrismaService = {
        userStats: {
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        userActivityLog: {
            findMany: jest.fn(),
            upsert: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        attempt: {
            count: jest.fn()
        }
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getUserStats', () => {
        it('should return aggregated stats', async () => {
            mockPrismaService.userStats.findUnique.mockResolvedValue({
                id: 1,
                userId: 1,
                xp: 100,
                energy: 5,
                user: { id: 1, firstName: 'Test', lastName: 'User' },
            });
            mockPrismaService.userStats.count.mockResolvedValue(5);
            mockPrismaService.attempt.count.mockResolvedValue(10);

            const result = await service.getUserStats(1);

            expect(result.xp).toEqual(100);
            expect(result.globalRank).toEqual(6);
            expect(result.quizzesSolved).toEqual(10);
        });

        it('should initialize stats if missing', async () => {
            mockPrismaService.userStats.findUnique.mockResolvedValue(null);
            mockPrismaService.user.findUnique.mockResolvedValue({ id: 99 });
            mockPrismaService.userStats.create.mockResolvedValue({
                id: 2, userId: 99, xp: 0
            });

            const result = await service.getUserStats(99);

            expect(mockPrismaService.userStats.create).toHaveBeenCalled();
            expect(result.xp).toEqual(0);
            expect(result.globalRank).toEqual(-1);
        });
    });

    describe('updateProfile', () => {
        const mockFile = {
            buffer: Buffer.from('test'),
        } as Express.Multer.File;

        it('should update profile and upload image', async () => {
            const mockUploadStream = jest.fn((options, callback) => {
                callback(null, { secure_url: 'http://cloudinary.com/image.jpg' });
                return { end: jest.fn() };
            });
            (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(mockUploadStream);

            mockPrismaService.user.update.mockResolvedValue({
                firstName: 'Updated',
                lastName: 'User',
                school: 'New School',
                profilePicture: 'http://cloudinary.com/image.jpg',
                email: 'test@example.com',
            });

            const result = await service.updateProfile(1, { firstName: 'Updated' }, mockFile);

            expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
            expect(mockPrismaService.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        profilePicture: 'http://cloudinary.com/image.jpg',
                    }),
                }),
            );
            expect(result.profilePicture).toBe('http://cloudinary.com/image.jpg');
        });

        it('should update profile without image', async () => {
            mockPrismaService.user.update.mockResolvedValue({
                firstName: 'Updated',
                lastName: 'User',
                school: 'New School',
                profilePicture: 'old_url',
                email: 'test@example.com',
            });

            await service.updateProfile(1, { firstName: 'Updated' });

            expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
            expect(mockPrismaService.user.update).toHaveBeenCalled();
        });
    });
});
