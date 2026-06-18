import { Module } from "@nestjs/common";
import { DocumentsFeatureModule } from "./documents/documents.module";

@Module({ imports: [DocumentsFeatureModule] })
export class DocumentsModule {}
