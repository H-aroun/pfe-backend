/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from './scenario.entity';
import { CreateScenarioDto, UpdateScenarioDto } from './dto/scenario.dto';
import { StatutScenario } from 'src/common/enums';
import {
  CourseBlock,
  CourseDocument,
  CourseLesson,
  CoursePage,
  CourseSection,
} from './course-document.types';
import { ScenarioDocument } from './scenario-document.types';

@Injectable()
export class ScenarioService {
  constructor(
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async findAll(): Promise<Scenario[]> {
    return this.scenarioRepo.find({
      relations: ['user', 'modules', 'parcours', 'ressources'],
    });
  }

  async findOne(id: number): Promise<Scenario> {
    const scenario = await this.scenarioRepo.findOne({
      where: { id },
      relations: [
        'user',
        'modules',
        'modules.sequences',
        'modules.sequences.activites',
        'modules.sequences.activites.quiz',
        'modules.sequences.activites.quiz.questions',
        'modules.sequences.activites.quiz.questions.reponses',
        'parcours',
        'ressources',
        'rapports',
      ],
    });
    if (!scenario) throw new NotFoundException(`Scénario #${id} introuvable`);
    this.sortScenarioTree(scenario);
    scenario.courseDocument ??= this.buildCourseDocumentFromTree(scenario);
    scenario.scenarioDocument ??= this.buildScenarioDocumentFromTree(scenario);
    return scenario;
  }

  async findByUser(userId: number): Promise<Scenario[]> {
    return this.scenarioRepo.find({
      where: { user: { id: userId } },
      relations: [
        'user',
        'modules',
        'modules.sequences',
        'modules.sequences.activites',
        'modules.sequences.activites.quiz',
        'modules.sequences.activites.quiz.questions',
        'modules.sequences.activites.quiz.questions.reponses',
        'parcours',
        'ressources',
        'rapports',
      ],
    });
  }

  async create(dto: CreateScenarioDto, userId: number): Promise<Scenario> {
    const scenario = this.scenarioRepo.create({
      ...dto,
      courseDocument:
        dto.courseDocument ??
        this.createEmptyCourseDocument(dto.titre, dto.description),
      scenarioDocument:
        dto.scenarioDocument ??
        this.createBlankScenarioDocument(
          `scenario-${Date.now()}`,
          dto.titre,
          dto.description,
        ),
      user: { id: userId },
    });
    return this.scenarioRepo.save(scenario);
  }

  async update(id: number, dto: UpdateScenarioDto): Promise<Scenario> {
    const scenario = await this.findOne(id);
    // Block edits once submitted for validation or beyond
    const lockedStatuses = [
      StatutScenario.EN_COURS_VALIDATION,
      StatutScenario.APPROUVE,
      StatutScenario.EXPORTE,
    ];
    if (lockedStatuses.includes(scenario.statut)) {
      throw new BadRequestException(
        `Impossible de modifier un scénario au statut "${scenario.statut}". Rejetez-le d'abord.`,
      );
    }
    const nextCourseVersion = (scenario.courseDocumentVersion ?? 1) + 1;
    const nextScenarioVersion = (scenario.scenarioDocumentVersion ?? 1) + 1;
    if (dto.courseDocument || dto.scenarioDocument) {
      const nextCourseDocument: CourseDocument | null = dto.courseDocument
        ? {
            ...dto.courseDocument,
            metadata: {
              ...dto.courseDocument.metadata,
              source: 'course_engine',
              version: nextCourseVersion,
            },
          }
        : scenario.courseDocument;
      const nextScenarioDocument: ScenarioDocument | null = dto.scenarioDocument
        ? this.versionScenarioDocument(
            dto.scenarioDocument,
            nextScenarioVersion,
          )
        : scenario.scenarioDocument;
      await this.scenarioRepo.save({
        ...scenario,
        ...dto,
        courseDocument: nextCourseDocument,
        courseDocumentVersion: dto.courseDocument
          ? nextCourseVersion
          : scenario.courseDocumentVersion,
        scenarioDocument: nextScenarioDocument,
        scenarioDocumentVersion: dto.scenarioDocument
          ? nextScenarioVersion
          : scenario.scenarioDocumentVersion,
      });
    } else {
      await this.scenarioRepo.update(id, dto as any);
    }
    return this.findOne(id);
  }

  async updateCourseDocument(
    id: number,
    courseDocument: CourseDocument,
  ): Promise<Scenario> {
    return this.update(id, {
      courseDocument,
      titre: courseDocument.title,
      description: courseDocument.description,
    });
  }

  async updateScenarioDocument(
    id: number,
    scenarioDocument: ScenarioDocument,
  ): Promise<Scenario> {
    return this.update(id, {
      scenarioDocument,
      titre: scenarioDocument.title,
      description: scenarioDocument.description,
    });
  }

  async remove(id: number): Promise<void> {
    const scenario = await this.findOne(id);
    await this.scenarioRepo.remove(scenario);
  }

  // ─── LIFECYCLE TRANSITIONS ───────────────────────────────────────────────

  /** BROUILLON → EN_COURS_VALIDATION */
  async submitForValidation(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.BROUILLON) {
      throw new BadRequestException(
        `Seul un scénario en brouillon peut être soumis pour validation. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, {
      statut: StatutScenario.EN_COURS_VALIDATION,
    });
    return this.findOne(id);
  }

  /** EN_COURS_VALIDATION → APPROUVE */
  async approve(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.EN_COURS_VALIDATION) {
      throw new BadRequestException(
        `Seul un scénario "en cours de validation" peut être approuvé. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.APPROUVE });
    return this.findOne(id);
  }

  /** EN_COURS_VALIDATION → BROUILLON (rejected) */
  async reject(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.EN_COURS_VALIDATION) {
      throw new BadRequestException(
        `Seul un scénario "en cours de validation" peut être rejeté. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.BROUILLON });
    return this.findOne(id);
  }

  /** APPROUVE → EXPORTE */
  async exportScenario(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.APPROUVE) {
      throw new BadRequestException(
        `Seul un scénario approuvé peut être exporté. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.EXPORTE });
    return this.findOne(id);
  }

  /** Any state → ARCHIVE */
  async archive(id: number): Promise<Scenario> {
    await this.findOne(id);
    await this.scenarioRepo.update(id, { statut: StatutScenario.ARCHIVE });
    return this.findOne(id);
  }

  /** Duplicate a scenario (clone) for another user */
  async duplicate(id: number, newUserId: number): Promise<Scenario> {
    const original = await this.findOne(id);
    const clone = this.scenarioRepo.create({
      titre: `${original.titre} (copie)`,
      description: original.description,
      objectif: original.objectif,
      niveau: original.niveau,
      dureeScenario: original.dureeScenario,
      statut: StatutScenario.BROUILLON,
      courseDocument: original.courseDocument
        ? {
            ...original.courseDocument,
            id: `scenario-${id}-copy-${Date.now()}`,
            title: `${original.courseDocument.title} (copie)`,
            metadata: {
              ...original.courseDocument.metadata,
              version: 1,
            },
          }
        : null,
      scenarioDocument: original.scenarioDocument
        ? {
            ...original.scenarioDocument,
            scenarioId: `scenario-${id}-copy-${Date.now()}`,
            title: `${original.scenarioDocument.title} (copie)`,
            metadata: {
              ...original.scenarioDocument.metadata,
              version: 1,
              updatedAt: new Date().toISOString(),
            },
          }
        : null,
      user: { id: newUserId },
    });
    return this.scenarioRepo.save(clone);
  }

  private createBlankScenarioDocument(
    scenarioId: string,
    title: string,
    description?: string,
  ): ScenarioDocument {
    const now = Date.now();
    const startNodeId = `start-${now}`;
    return {
      schemaVersion: 1,
      scenarioId,
      title: title || 'Untitled Scenario',
      description,
      settings: {
        autosave: true,
        allowBacktracking: true,
        showProgress: true,
        shuffleChoices: false,
        completionTracking: true,
        scoreTracking: true,
      },
      nodes: [
        {
          id: startNodeId,
          type: 'start',
          speaker: {
            name: 'Narrator',
            role: 'Guide',
          },
          content: {
            title: 'Start',
            body: 'This is where the scenario begins.',
            tone: 'friendly',
          },
          choices: [
            {
              id: `choice-${now}`,
              text: 'Add next step',
              scoreDelta: 0,
            },
          ],
          feedback: {},
          media: [],
          conditions: [],
          effects: [],
          position: { x: 120, y: 160 },
        },
      ],
      connections: [],
      variables: [],
      scoring: {
        enabled: true,
        maxScore: 100,
        passingScore: 80,
        completionMode: 'visited_end',
      },
      metadata: {
        source: 'blank',
        version: 1,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiReady: true,
        scormReady: true,
      },
    };
  }

  private versionScenarioDocument(
    document: ScenarioDocument,
    version: number,
  ): ScenarioDocument {
    return {
      ...document,
      metadata: {
        ...document.metadata,
        version,
        updatedAt: new Date().toISOString(),
        aiReady: true,
        scormReady: true,
      },
    };
  }

  private createEmptyCourseDocument(
    title: string,
    description?: string,
  ): CourseDocument {
    const now = Date.now();
    const lessonId = `lesson-${now}`;
    const blockId = `block-${now}`;
    return {
      schemaVersion: 1,
      id: `course-${now}`,
      title,
      description,
      objectives: [],
      sections: [
        {
          id: `section-${now}`,
          title: 'Course content',
          lessonIds: [lessonId],
        },
      ],
      lessons: [
        {
          id: lessonId,
          type: 'lesson',
          title: 'Introduction',
          summary: description,
          estimatedMinutes: 5,
          blocks: [
            {
              id: `heading-${now}`,
              type: 'heading',
              category: 'text',
              title: 'Introduction',
              content: title,
            },
            {
              id: blockId,
              type: 'paragraph',
              category: 'text',
              content:
                description || 'Start building your learning experience here.',
            },
          ],
        },
      ],
      pages: [
        {
          id: lessonId,
          type: 'lesson',
          title: 'Introduction',
          summary: description,
          blocks: [
            {
              id: `heading-${now}`,
              type: 'heading',
              category: 'text',
              title: 'Introduction',
              content: title,
            },
            {
              id: blockId,
              type: 'paragraph',
              category: 'text',
              content:
                description || 'Start building your learning experience here.',
            },
          ],
        },
      ],
      settings: {
        completionMode: 'pages',
        passingScore: 80,
        scormVersion: '1.2',
        completionPercentage: 100,
        requireQuizPass: true,
      },
      theme: {
        accentColor: '#0F6B4A',
        fontPairing: 'modern',
        coverLayout: 'centered',
        navigationMode: 'sidebar',
        lessonNumbers: true,
        sidebarEnabled: true,
      },
      publish: {
        target: 'lms',
        lmsStandard: 'scorm_1_2',
        tracking: 'completion_and_score',
        completionPercentage: 100,
        passingScore: 80,
        reportingStatus: 'completed_passed',
      },
      metadata: {
        source: 'course_engine',
        generatedAt: new Date().toISOString(),
        version: 1,
      },
    };
  }

  private buildCourseDocumentFromTree(scenario: Scenario): CourseDocument {
    const pages: CoursePage[] = [];
    const lessons: CourseLesson[] = [];
    const sections: CourseSection[] = [];

    scenario.modules?.forEach((module) => {
      const section: CourseSection = {
        id: `section-module-${module.id}`,
        title: module.titre,
        lessonIds: [],
      };

      module.sequences?.forEach((sequence) => {
        const blocks: CourseBlock[] = [];

        if (sequence.texte || sequence.description) {
          blocks.push({
            id: `sequence-${sequence.id}-text`,
            type: 'paragraph',
            category: 'text',
            content: sequence.texte || sequence.description,
          });
        }

        sequence.activites?.forEach((activity) => {
          if (activity.quiz) {
            const quizLesson: CourseLesson = {
              id: `quiz-${activity.id}`,
              type: 'quiz',
              title: activity.titre,
              summary: activity.consigne,
              blocks: [],
              quiz: {
                passingScore: activity.quiz.scorePourReussir ?? 70,
                showFeedback: true,
                questions: (activity.quiz.questions ?? []).map((question) => ({
                  id: `question-${question.id}`,
                  type:
                    String(question.type) === 'vrai_faux'
                      ? 'true_false'
                      : 'multiple_choice',
                  text: question.titre,
                  points: question.points ?? 1,
                  options: (question.reponses ?? []).map((answer) => ({
                    id: `answer-${answer.id}`,
                    text: answer.texte,
                    isCorrect: answer.estCorrect,
                    feedback: answer.feedback,
                  })),
                })),
              },
              metadata: {
                legacyActivityId: activity.id,
                legacySequenceId: sequence.id,
                legacyModuleId: module.id,
              },
            };
            lessons.push(quizLesson);
            pages.push(this.lessonToPage(quizLesson));
            section.lessonIds.push(quizLesson.id);
            return;
          }

          blocks.push({
            id: `activity-${activity.id}`,
            type: String(activity.type) === 'video' ? 'video' : 'paragraph',
            category: String(activity.type) === 'video' ? 'media' : 'text',
            title: activity.titre,
            content: activity.consigne,
            assetUrl:
              String(activity.type) === 'video' ? activity.consigne : undefined,
            metadata: {
              legacyActivityId: activity.id,
              activityType: activity.type,
            },
          });
        });

        const lesson: CourseLesson = {
          id: `sequence-${sequence.id}`,
          type: 'lesson',
          title: sequence.titre,
          summary: sequence.description,
          blocks,
          estimatedMinutes: 5,
          metadata: {
            legacySequenceId: sequence.id,
            legacyModuleId: module.id,
            moduleTitle: module.titre,
          },
        };
        lessons.push(lesson);
        pages.push(this.lessonToPage(lesson));
        section.lessonIds.push(lesson.id);
      });

      if (section.lessonIds.length) sections.push(section);
    });

    if (!lessons.length) {
      return this.createEmptyCourseDocument(
        scenario.titre,
        scenario.description,
      );
    }

    return {
      schemaVersion: 1,
      id: `scenario-${scenario.id}`,
      title: scenario.titre,
      description: scenario.description,
      objectives: scenario.objectif ? [scenario.objectif] : [],
      estimatedMinutes: scenario.dureeScenario,
      sections,
      lessons,
      pages,
      settings: {
        completionMode: 'pages',
        passingScore: 80,
        scormVersion: '1.2',
        completionPercentage: 100,
        requireQuizPass: true,
      },
      theme: {
        accentColor: '#0F6B4A',
        fontPairing: 'modern',
        coverLayout: 'centered',
        navigationMode: 'sidebar',
        lessonNumbers: true,
        sidebarEnabled: true,
      },
      publish: {
        target: 'lms',
        lmsStandard: 'scorm_1_2',
        tracking: 'completion_and_score',
        completionPercentage: 100,
        passingScore: 80,
        reportingStatus: 'completed_passed',
      },
      metadata: {
        source: 'legacy_tree',
        generatedAt: new Date().toISOString(),
        version: scenario.courseDocumentVersion ?? 1,
      },
    };
  }

  private buildScenarioDocumentFromTree(scenario: Scenario): ScenarioDocument {
    const document = this.createBlankScenarioDocument(
      `scenario-${scenario.id}`,
      scenario.titre,
      scenario.description,
    );
    const nodes = [...document.nodes];
    const connections = [...document.connections];
    let previousNodeId = nodes[0]?.id;
    let offset = 0;

    scenario.modules?.forEach((module) => {
      module.sequences?.forEach((sequence) => {
        const infoNodeId = `sequence-${sequence.id}`;
        nodes.push({
          id: infoNodeId,
          type: 'information',
          speaker: {
            name: module.titre,
            role: 'Module',
          },
          content: {
            title: sequence.titre,
            body: sequence.description ?? sequence.texte ?? '',
            tone: 'neutral',
          },
          choices: [],
          feedback: {},
          media: [],
          conditions: [],
          effects: [],
          position: { x: 420 + offset * 280, y: 160 },
        });

        if (previousNodeId) {
          connections.push({
            id: `connection-${previousNodeId}-${infoNodeId}`,
            sourceNodeId: previousNodeId,
            targetNodeId: infoNodeId,
            label: 'Continue',
          });
        }

        previousNodeId = infoNodeId;
        offset += 1;

        sequence.activites?.forEach((activity) => {
          const nodeId = `activity-${activity.id}`;
          nodes.push({
            id: nodeId,
            type: activity.quiz ? 'choice' : 'dialogue',
            speaker: {
              name: module.titre,
              role: 'Instructor',
            },
            content: {
              title: activity.titre,
              body: activity.consigne ?? '',
              tone: 'friendly',
            },
            choices: activity.quiz
              ? (activity.quiz.questions?.[0]?.reponses ?? []).map((answer) => ({
                  id: `answer-${answer.id}`,
                  text: answer.texte,
                  scoreDelta: answer.estCorrect ? 10 : 0,
                  feedback: answer.feedback,
                }))
              : [],
            feedback: {},
            media: [],
            conditions: [],
            effects: [],
            position: { x: 420 + offset * 280, y: 160 },
          });
          if (previousNodeId) {
            connections.push({
              id: `connection-${previousNodeId}-${nodeId}`,
              sourceNodeId: previousNodeId,
              targetNodeId: nodeId,
              label: 'Continue',
            });
          }
          previousNodeId = nodeId;
          offset += 1;
        });
      });
    });

    if (previousNodeId && previousNodeId !== nodes[0]?.id) {
      const endingNodeId = `ending-${scenario.id}`;
      nodes.push({
        id: endingNodeId,
        type: 'ending',
        speaker: {
          name: 'Narrator',
          role: 'Guide',
        },
        content: {
          title: 'Ending',
          body: 'Scenario complete.',
          tone: 'friendly',
        },
        choices: [],
        feedback: {},
        media: [],
        conditions: [],
        effects: [{ id: `complete-${scenario.id}`, type: 'complete', value: true }],
        position: { x: 420 + offset * 280, y: 160 },
      });
      connections.push({
        id: `connection-${previousNodeId}-${endingNodeId}`,
        sourceNodeId: previousNodeId,
        targetNodeId: endingNodeId,
        label: 'Finish',
      });
    }

    return {
      ...document,
      nodes,
      connections,
      metadata: {
        ...document.metadata,
        source: 'legacy_tree',
        version: scenario.scenarioDocumentVersion ?? 1,
      },
    };
  }

  private lessonToPage(lesson: CourseLesson): CoursePage {
    return {
      id: lesson.id,
      type: lesson.type === 'quiz' ? 'quiz' : 'lesson',
      title: lesson.title,
      summary: lesson.summary,
      blocks: lesson.blocks,
      quiz: lesson.quiz
        ? {
            passingScore: lesson.quiz.passingScore,
            questions: lesson.quiz.questions,
          }
        : undefined,
      metadata: lesson.metadata,
    };
  }

  private sortScenarioTree(scenario: Scenario): void {
    scenario.modules?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
    scenario.modules?.forEach((module) => {
      module.sequences?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
      module.sequences?.forEach((sequence) => {
        sequence.activites?.sort((a, b) => a.ordre - b.ordre || a.id - b.id);
      });
    });
  }
}
