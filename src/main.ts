import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as express from 'express';
import { join } from 'path';
import xmlparser = require('express-xml-bodyparser');
dotenv.config();

async function bootstrap() {
  console.log('port: ', process.env.PORT)

  const port = Number(process.env.PORT || '3000');


  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true
  });

  const logger = new Logger();

  //配置cookie中间件
  app.use(cookieParser('password'));

  app.use(cors());

  //配置session中间件 
  app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60000,
      secure: true,
      httpOnly: true
    },
    rolling: true
  }));

  app.useStaticAssets('public');
  app.setBaseViewsDir('views');
  app.setViewEngine('ejs');

  // 添加 XML 解析中间件
  app.use(xmlparser());

  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // 此处的api为访问路径，即http://localhost:3000/api
  SwaggerModule.setup('api', app, document);


  await app.listen(port);

  logger.log( `Application is running on: http://localhost:${port}/api` )

  if(process.env.PORT === undefined){
    while(true) logger.error('请注意！系统检测不到.env文件，请确认您已配置.env文件！')
  }
}
bootstrap();