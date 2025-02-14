import { Test, TestingModule } from '@nestjs/testing';
import { PreAuthCodeService } from './pre-auth-code.service';

describe('PreAuthCodeService', () => {
  let service: PreAuthCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreAuthCodeService],
    }).compile();

    service = module.get<PreAuthCodeService>(PreAuthCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
