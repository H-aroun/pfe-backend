import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeRessource } from 'src/common/enums';
import { Ressource } from 'src/ressource/ressource.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Ressource)
    private readonly ressourceRepo: Repository<Ressource>,
  ) {}

  /**
   * After Multer saves the file to disk, update the linked Ressource record
   * with the file URL (relative path) and size in bytes.
   */
  async attachFileToRessource(
    ressourceId: number,
    file: Express.Multer.File,
  ): Promise<Ressource> {
    const ressource = await this.ressourceRepo.findOne({
      where: { id: ressourceId },
    });
    if (!ressource) {
      throw new NotFoundException(`Ressource #${ressourceId} introuvable`);
    }

    // Store the relative path so it can be served statically
    ressource.url = `/uploads/${file.filename}`;
    ressource.taille = file.size;
    ressource.type = this.typeFromMime(file.mimetype, ressource.type);

    return this.ressourceRepo.save(ressource);
  }

  private typeFromMime(
    mimetype: string,
    fallback: TypeRessource,
  ): TypeRessource {
    if (mimetype.startsWith('video/')) return TypeRessource.VIDEO;
    if (mimetype.startsWith('image/')) return TypeRessource.MASS;
    if (mimetype.startsWith('audio/')) return TypeRessource.AUDIO;
    return fallback ?? TypeRessource.DOCUMENT;
  }
}
