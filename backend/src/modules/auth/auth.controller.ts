import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { Public } from "../../common/decorators/auth.decorators";
import {
  CurrentUser,
  type AuthenticatedRequest,
} from "../../common/decorators/current-user.decorator";

function clientMeta(req: AuthenticatedRequest | { ip?: string; headers: Record<string, unknown>; socket?: { remoteAddress?: string } }) {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? String(forwarded[0] ?? "").split(",")[0]?.trim()
        : undefined;
  const ipAddress =
    forwardedIp ||
    ("ip" in req && typeof req.ip === "string" ? req.ip : undefined) ||
    req.socket?.remoteAddress;
  const ua = req.headers["user-agent"];
  const userAgent = typeof ua === "string" ? ua : undefined;
  return { ipAddress, userAgent };
}

// Brute-force protection: max 10 attempts/min per IP on auth endpoints
// (stricter than the global 100/min Throttler default).
@Throttle({ short: { limit: 10, ttl: 60000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.register(dto, clientMeta(req));
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.authService.login(dto, clientMeta(req));
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    await this.authService.logout(userId, token);
    return { loggedOut: true };
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser("userId") userId: string) {
    await this.authService.logoutAll(userId);
    return { loggedOut: true };
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser("userId") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { changed: true };
  }
}
