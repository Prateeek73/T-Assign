//==============================================================================
// UPS Authentication Manager
//============================================================================

import axios, { AxiosError, AxiosInstance } from "axios";
import { UPSConfig } from "../../config";
import {
  AuthenticationError,
  InvalidCredentialsError,
  NetworkError,
  TimeoutError,
} from "../../errors";


interface CachedToken {
  accessToken: string;
  expiresAt: Date;
  tokenType: string;
}

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min early

export class UPSAuthManager {
  private cachedToken: CachedToken | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;
  private readonly httpClient: AxiosInstance;
  private readonly config: UPSConfig;

  constructor(config: UPSConfig, httpClient?: AxiosInstance) {
    this.config = config;
    this.httpClient = httpClient ?? axios.create({ timeout: config.timeoutMs });
  }

  // Get a valid access token, refreshing if necessary
  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) return this.cachedToken!.accessToken;
    if (this.tokenRefreshPromise) return this.tokenRefreshPromise;
    this.tokenRefreshPromise = this.refreshToken();

    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  // Force refresh the token (e.g. on auth error)
  async forceRefresh(): Promise<string> {
    this.cachedToken = null;
    return this.getAccessToken();
  }

  // Check if the current token is valid (exists and not expired)
  private isTokenValid(): boolean {
    if (!this.cachedToken) return false;
    const now = new Date();
    const bufferTime = new Date(
      this.cachedToken.expiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS,
    );
    return now < bufferTime;
  }

  // Refresh the access token from UPS
  private async refreshToken(): Promise<string> {
    const { clientId, clientSecret, tokenUrl } = this.config;
    if (!clientId || !clientSecret) throw new InvalidCredentialsError("UPS");
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );
    try {
      const response = await this.httpClient.post<any>(
        tokenUrl,
        "grant_type=client_credentials",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
          },
        },
      );
      const tokenData = response.data;
      this.cachedToken = {
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        tokenType: tokenData.token_type,
      };
      return this.cachedToken.accessToken;
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof InvalidCredentialsError
      )
        throw error;
      if (axios.isAxiosError(error)) throw this.handleAxiosError(error);
      throw new AuthenticationError("Failed to obtain UPS access token", {
        carrier: "UPS",
        originalError:
          error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  // For testing purposes: set a mock token directly
  private handleAxiosError(error: AxiosError): never {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new TimeoutError("Token request timed out", this.config.timeoutMs, {
        carrier: "UPS",
      });
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new NetworkError("Failed to connect to UPS authentication server", {
        carrier: "UPS",
        originalError: error,
      });
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        throw new InvalidCredentialsError("UPS");
      }

      throw new AuthenticationError(
        `UPS authentication failed with status ${status}`,
        {
          carrier: "UPS",
          httpStatus: status,
          originalError: error,
        },
      );
    }

    throw new NetworkError("Network error during UPS authentication", {
      carrier: "UPS",
      originalError: error,
    });
  }

  // For testing: get current token state
  getTokenState(): { hasToken: boolean; expiresAt?: Date; isValid: boolean } {
    return {
      hasToken: this.cachedToken !== null,
      expiresAt: this.cachedToken?.expiresAt,
      isValid: this.isTokenValid(),
    };
  }

  // For testing: clear the cached token
  clearCache(): void {
    this.cachedToken = null;
    this.tokenRefreshPromise = null;
  }
}
