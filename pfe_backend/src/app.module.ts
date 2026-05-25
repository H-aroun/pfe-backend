import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { SeederModule } from './seeder/seeder.module';
import { RoleModule } from './role/role.module';
import { ScenarioModule } from './scenario/scenario.module';
import { ParcoursModule } from './parcours/parcours.module';
import { CourseModuleModule } from './course-module/course-module.module';
import { SequenceModule } from './sequence/sequence.module';
import { RessourceModule } from './ressource/ressource.module';
import { ActiviteModule } from './activite/activite.module';
import { QuizModule } from './quiz/quiz.module';
import { QuestionModule } from './question/question.module';
import { ReponseModule } from './reponse/reponse.module';
import { RapportModule } from './rapport/rapport.module';
import { ScenarioShareModule } from './scenario-share/scenario-share.module';
import { MediaModule } from './media/media.module';
import { ScormModule } from './scorm/scorm.module';
import { ScenarioCollaborationModule } from './scenario-collaboration/scenario-collaboration.module';
import config from './config/config';
import dbConfig from './config/db.config';

@Module({
  imports: [
    SeederModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => dbConfig(configService),
    }),
    AuthModule,
    UserModule,
    RoleModule,
    ScenarioModule,
    ParcoursModule,
    CourseModuleModule,
    SequenceModule,
    RessourceModule,
    ActiviteModule,
    QuizModule,
    QuestionModule,
    ReponseModule,
    RapportModule,
    ScenarioShareModule,
    ScenarioCollaborationModule,
    ScormModule,
    MediaModule,
  ],
})
export class AppModule {}
