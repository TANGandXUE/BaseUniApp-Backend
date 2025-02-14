import { Test, TestingModule } from '@nestjs/testing';
import { PreAuthCodeController } from './pre-auth-code.controller';

describe('PreAuthCodeController', () => {
  let controller: PreAuthCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreAuthCodeController],
    }).compile();

    controller = module.get<PreAuthCodeController>(PreAuthCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
