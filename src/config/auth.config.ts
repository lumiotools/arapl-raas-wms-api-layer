import { ConfigService } from '@nestjs/config';

export const getAuthConfig = (configService: ConfigService) => {
  return {
    secretToken: configService.get<string>(
      'SECRET_TOKEN',
      'your-super-secret-alphanumeric-token-d8f7g6h5j4k3l2',
    ),
    requiredVersion: configService.get<string>('REQUIRED_VERSION', '2.1.3'),
  };
};

// Legacy exports for backward compatibility
export const SECRET_TOKEN =
  process.env.SECRET_TOKEN ||
  'your-super-secret-alphanumeric-token-d8f7g6h5j4k3l2';
export const REQUIRED_VERSION = process.env.REQUIRED_VERSION || '2.1.3';
