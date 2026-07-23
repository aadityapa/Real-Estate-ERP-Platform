import { Module } from "@nestjs/common";
import { LegalFeatureModule } from "./legal/legal.module";
import { ReraModule } from "./rera/rera.module";
import { AgreementsModule } from "./agreements/agreements.module";
import { ESignModule } from "./esign/esign.module";

@Module({
  imports: [LegalFeatureModule, ReraModule, AgreementsModule, ESignModule],
})
export class LegalModule {}
