export type CoursePageType = 'lesson' | 'branching_scenario' | 'quiz' | 'media';
export type CourseLessonType = 'lesson' | 'quiz';
export type CourseBlockCategory =
  | 'text'
  | 'statement'
  | 'list'
  | 'media'
  | 'interactive'
  | 'knowledge_check'
  | 'chart'
  | 'divider';
export type CourseBlockType =
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'callout'
  | 'statement'
  | 'quote'
  | 'list'
  | 'image'
  | 'gallery'
  | 'audio'
  | 'video'
  | 'embed'
  | 'attachment'
  | 'document'
  | 'code'
  | 'accordion'
  | 'tabs'
  | 'process'
  | 'timeline'
  | 'flashcards'
  | 'sorting'
  | 'labeled_graphic'
  | 'scenario'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'knowledge_check'
  | 'chart';

export type CourseKnowledgeCheckType =
  | 'multiple_choice'
  | 'multiple_response'
  | 'fill_blank'
  | 'matching';
export type CourseQuizQuestionType = CourseKnowledgeCheckType | 'true_false';

export interface CourseInteractionItem {
  id: string;
  title: string;
  content?: string;
  mediaUrl?: string;
  marker?: { x: number; y: number };
  match?: string;
}

export interface CourseKnowledgeCheckOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
  match?: string;
}

export interface CourseKnowledgeCheck {
  type: CourseKnowledgeCheckType;
  question: string;
  options: CourseKnowledgeCheckOption[];
  correctFeedback?: string;
  incorrectFeedback?: string;
  allowRetry?: boolean;
}

export interface CourseBlock {
  id: string;
  type: CourseBlockType;
  category?: CourseBlockCategory;
  title?: string;
  content?: string;
  assetUrl?: string;
  items?: CourseInteractionItem[];
  knowledgeCheck?: CourseKnowledgeCheck;
  metadata?: Record<string, unknown>;
}

export interface BranchingChoice {
  id: string;
  text: string;
  nextNodeId?: string;
  score?: number;
  feedback?: string;
}

export interface BranchingNode {
  id: string;
  speaker?: string;
  text: string;
  emotion?: string;
  position?: { x: number; y: number };
  choices: BranchingChoice[];
}

export interface QuizQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
  match?: string;
}

export interface QuizQuestion {
  id: string;
  type: CourseQuizQuestionType | 'mcq';
  text: string;
  points: number;
  options: QuizQuestionOption[];
  feedback?: string;
}

export interface CourseLesson {
  id: string;
  type: CourseLessonType;
  title: string;
  summary?: string;
  estimatedMinutes?: number;
  coverImageUrl?: string;
  blocks: CourseBlock[];
  quiz?: {
    passingScore: number;
    timeLimitMinutes?: number;
    attempts?: number;
    randomizeQuestions?: boolean;
    randomizeAnswers?: boolean;
    showFeedback?: boolean;
    questions: QuizQuestion[];
  };
  metadata?: Record<string, unknown>;
}

export interface CourseSection {
  id: string;
  title: string;
  lessonIds: string[];
  collapsed?: boolean;
}

export interface CourseTheme {
  accentColor: string;
  fontPairing: 'modern' | 'classic' | 'serif' | 'friendly';
  coverLayout: 'centered' | 'split' | 'compact';
  navigationMode: 'sidebar' | 'compact' | 'continuous';
  lessonNumbers: boolean;
  sidebarEnabled: boolean;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface CoursePublishSettings {
  target: 'lms' | 'web' | 'pdf';
  lmsStandard: 'scorm_1_2' | 'scorm_2004' | 'xapi' | 'cmi5' | 'aicc';
  tracking: 'completion' | 'quiz_score' | 'completion_and_score';
  completionPercentage: number;
  passingScore: number;
  reportingStatus: 'completed_passed' | 'completed_failed' | 'passed_failed';
}

export interface CoursePage {
  id: string;
  type: CoursePageType;
  title: string;
  summary?: string;
  blocks?: CourseBlock[];
  scenario?: {
    startNodeId: string;
    nodes: BranchingNode[];
    passingScore?: number;
  };
  quiz?: {
    passingScore: number;
    questions: QuizQuestion[];
  };
  metadata?: Record<string, unknown>;
}

export interface CourseDocument {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  estimatedMinutes?: number;
  sections?: CourseSection[];
  lessons?: CourseLesson[];
  pages: CoursePage[];
  settings: {
    completionMode: 'pages' | 'score';
    passingScore: number;
    scormVersion: '1.2' | '2004';
    completionPercentage?: number;
    requireQuizPass?: boolean;
  };
  theme?: CourseTheme;
  publish?: CoursePublishSettings;
  metadata?: {
    source?: 'legacy_tree' | 'course_engine' | 'ai_draft';
    generatedAt?: string;
    version?: number;
  };
}
