import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

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
        },
        attempt: {
            count: jest.fn()
        }
    };

    beforeEach(async () => {
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
            mockPrismaService.userStats.count.mockResolvedValue(5); // 5 users ahead
            mockPrismaService.attempt.count.mockResolvedValue(10); // 10 quizzes solved

            const result = await service.getUserStats(1);

            expect(result.xp).toEqual(100);
            expect(result.globalRank).toEqual(6); // 5 + 1
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
});
