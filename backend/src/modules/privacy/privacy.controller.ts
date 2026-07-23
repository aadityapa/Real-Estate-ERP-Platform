import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  CurrentUser,
  TenantId,
} from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/constants/permissions";
import { PrivacyService } from "./privacy.service";
import {
  CorrectCustomerDto,
  EraseCustomerDto,
  RecordConsentDto,
} from "./dto/privacy.dto";

@Controller("privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get("purposes")
  @RequirePermissions(Permissions.PRIVACY_CONSENT_READ)
  listPurposes() {
    return this.privacy.listPurposes();
  }

  @Get("residency")
  @RequirePermissions(Permissions.PRIVACY_RESIDENCY_READ)
  residency() {
    return this.privacy.residencyStatus();
  }

  @Get("customers/:id/consents")
  @RequirePermissions(Permissions.PRIVACY_CONSENT_READ)
  consentStatus(
    @TenantId() tenantId: string,
    @Param("id") customerId: string,
  ) {
    return this.privacy.getConsentStatus(tenantId, customerId);
  }

  @Post("customers/:id/consents")
  @RequirePermissions(Permissions.PRIVACY_CONSENT_WRITE)
  recordConsent(
    @TenantId() tenantId: string,
    @Param("id") customerId: string,
    @Body() dto: RecordConsentDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.privacy.recordConsent(tenantId, customerId, dto, userId);
  }

  @Get("customers/:id/export")
  @RequirePermissions(Permissions.PRIVACY_CUSTOMER_EXPORT)
  @Header("Content-Type", "application/json")
  export(
    @TenantId() tenantId: string,
    @Param("id") customerId: string,
    @CurrentUser("userId") userId: string,
  ) {
    return this.privacy.exportCustomer(tenantId, customerId, userId);
  }

  @Patch("customers/:id")
  @RequirePermissions(Permissions.PRIVACY_CUSTOMER_CORRECT)
  correct(
    @TenantId() tenantId: string,
    @Param("id") customerId: string,
    @Body() dto: CorrectCustomerDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.privacy.correctCustomer(tenantId, customerId, dto, userId);
  }

  @Delete("customers/:id")
  @RequirePermissions(Permissions.PRIVACY_CUSTOMER_ERASE)
  erase(
    @TenantId() tenantId: string,
    @Param("id") customerId: string,
    @Body() dto: EraseCustomerDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.privacy.eraseCustomer(tenantId, customerId, dto, userId);
  }
}
