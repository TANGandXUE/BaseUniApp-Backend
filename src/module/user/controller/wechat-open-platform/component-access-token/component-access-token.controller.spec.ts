import { Test, TestingModule } from '@nestjs/testing';
import { ComponentAccessTokenController } from './component-access-token.controller';

describe('ComponentAccessTokenController', () => {
  let controller: ComponentAccessTokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentAccessTokenController],
    }).compile();

    controller = module.get<ComponentAccessTokenController>(ComponentAccessTokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
