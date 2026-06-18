import { Module } from "@nestjs/common";
import { NotificationsFeatureModule } from "./notifications/notifications.module";

@Module({ imports: [NotificationsFeatureModule] })
export class NotificationsModule {}
