import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import type { CourseDocument } from '../course-document.types';

export class UpdateCourseDocumentDto {
  @ApiProperty({
    description:
      'Structured, exportable course document used by the editor and SCORM runtime.',
    type: Object,
  })
  @ApiProperty({ type: Object })
  @IsObject()
  courseDocument: CourseDocument;
}
