import { Test, TestingModule } from '@nestjs/testing';
import { ComponentAccessTokenService } from './component-access-token.service';

describe('ComponentAccessTokenService', () => {
  let service: ComponentAccessTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComponentAccessTokenService],
    }).compile();

    service = module.get<ComponentAccessTokenService>(ComponentAccessTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
