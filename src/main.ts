import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


async function bootstrap() {
  console.log(`Trying to run on port ${process.env.PORT ?? 8000}`);
  const app = await NestFactory.create(AppModule);
    const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API documentation for my application')
    .setVersion('1.0')
   
    .addApiKey(
    {
      type: 'apiKey',
      name: 'authorization', // header key
      in: 'header',
    },
    'api-key', // name to reference in @ApiSecurity
  )
    .build();
  
  app.enableCors({
    origin: [
      'https://arapl-raas-gtp-ui.vercel.app',
      'https://arapl-raas-gtp.onrender.com'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); 
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
