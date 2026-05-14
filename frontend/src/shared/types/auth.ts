export interface UserDto {
    id: string;
    email: string;
    username: string;
    fullName?: string;
    role: string;
    quotaUsed: number;
    quotaTotal: number;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: UserDto;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    fullName: string;
}
