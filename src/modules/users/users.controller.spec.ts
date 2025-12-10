import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let service: UsersService;

    const mockUsersService = {
        getUserStats: jest.fn(),
        getHeatmap: jest.fn(),
        getUserProfile: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        service = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getHelper', () => {
        it('should return user profile', async () => {
            const mockProfile = {
                name: 'John Doe',
                school: 'Harvard',
                profilePicture: 'pic.jpg',
            };
            mockUsersService.getUserProfile.mockResolvedValue(mockProfile);

            const req = { user: { id: 1 } };
            const result = await controller.getHelper(req);

            expect(service.getUserProfile).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockProfile);
        });
    });
});
