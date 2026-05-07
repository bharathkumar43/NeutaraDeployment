import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
export declare const generateToken: (payload: JwtPayload) => string;
export declare const verifyToken: (token: string) => JwtPayload;
export declare const decodeToken: (token: string) => string | jwt.JwtPayload | null;
//# sourceMappingURL=jwt.d.ts.map