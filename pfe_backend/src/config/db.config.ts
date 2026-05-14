import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Role } from 'src/role/role.entity';
import { User } from 'src/users/user.entity';
import { Scenario } from 'src/scenario/scenario.entity';
import { Parcours } from 'src/parcours/parcours.entity';
import { CourseModule } from 'src/course-module/course-module.entity';
import { Sequence } from 'src/sequence/sequence.entity';
import { Ressource } from 'src/ressource/ressource.entity';
import { Activite } from 'src/activite/activite.entity';
import { Quiz } from 'src/quiz/quiz.entity';
import { Question } from 'src/question/question.entity';
import { Reponse } from 'src/reponse/reponse.entity';
import { Rapport } from 'src/rapport/rapport.entity';
import { ScenarioShare } from 'src/scenario-share/scenario-share.entity';

export default (configService: ConfigService): TypeOrmModuleOptions => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const databaseUrl = configService.get('database.url');

  return {
    type: 'postgres',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    url: databaseUrl,
    entities: [
      User,
      Role,
      Scenario,
      Parcours,
      CourseModule,
      Sequence,
      Ressource,
      Activite,
      Quiz,
      Question,
      Reponse,
      Rapport,
      ScenarioShare,
    ],
    synchronize: true,
  };
};
