import { TypeOrmModuleOptions } from '@nestjs/typeorm';

let DBEnv: string = 'local';

let DBCredentials: any = {
  local: {
    username: 'postgres',
    password: 'rishav',
    database: 'wms_api_layer',
  },
};

export const DBConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: DBCredentials[DBEnv].username,
  password: DBCredentials[DBEnv].password,
  database: DBCredentials[DBEnv].database,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Set to false in production
  logging: true, // Enable logging for debugging
};
