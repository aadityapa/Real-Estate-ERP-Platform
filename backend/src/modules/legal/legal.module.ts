import { Module } from "@nestjs/common";
import { LegalFeatureModule } from "./legal/legal.module";

@Module({ imports: [LegalFeatureModule] })
export class LegalModule {}
