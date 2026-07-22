import { Module } from "@nestjs/common";
import { AssetsFeatureModule } from "./assets/assets.module";

@Module({ imports: [AssetsFeatureModule] })
export class AssetsModule {}
