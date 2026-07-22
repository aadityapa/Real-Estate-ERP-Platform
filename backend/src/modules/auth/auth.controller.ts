import { Controller, Post, Body, HttpCode, HttpStatus, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto, RefreshTokenDto } from "./dto/auth.dto";
import { Public } from "../../common/decorators/auth.decorators";
import {
  CurrentUser,
  type AuthenticatedRequest,
} from "../../common/decorators/current-user.decorator";

// Brute-force protection: max 10 attempts/min per IP on auth endpoints
@Throttle({ short: { limit: 10, ttl: 60000 } })
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
}
