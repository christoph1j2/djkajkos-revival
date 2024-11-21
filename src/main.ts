import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandsService } from 'necord';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const commandService = app.get(CommandsService);

  try {
    await commandService.registerAllCommands();
    Logger.log('Global commands registered successfully');

    const GUILD_ID = '674273672524988440'; // Replace with your server ID
    if (GUILD_ID) {
      await commandService.registerInGuild(GUILD_ID);
      Logger.log(`Guild commands registered in guild ID: ${GUILD_ID}`);
    }
  } catch (error) {
    Logger.error('Error registering commands', error);
  }

  await app.listen(3000);
}
bootstrap();
