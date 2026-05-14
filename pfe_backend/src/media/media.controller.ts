import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { MediaService } from './media.service';


@ApiTags('media')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Post('upload/ressource/:ressourceId')
  @ApiOperation({ summary: 'Uploader un fichier et lier à une Ressource' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|mp4|webm|pdf|doc|docx|ppt|pptx)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(
            new BadRequestException('Type de fichier non supporté'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadForRessource(
    @Param('ressourceId', ParseIntPipe) ressourceId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100 MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.mediaService.attachFileToRessource(ressourceId, file);
  }
}
