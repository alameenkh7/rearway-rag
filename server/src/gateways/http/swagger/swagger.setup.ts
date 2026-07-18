import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Resolve RAG — Trial API')
    .setDescription(
      'Trial-plan bot creation, session, and chat endpoints. ' +
        'Three separate token types protect different endpoints — see each ' +
        'security scheme below for where it applies.'
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Verification token from /auth/otp/verify — required on POST /bots',
      },
      'verification-token'
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Session token from POST /bots/:botId/session — required on POST /bots/:botId/chat',
      },
      'session-token'
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Embed-Token',
        description:
          "The bot's embed token — required on session-start and chat",
      },
      'embed-token'
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)
}
