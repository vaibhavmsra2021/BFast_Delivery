import { Request, Response, NextFunction } from "express";
import { IStorage } from "../storage";
import { UserRole, User } from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "shopify-order-management-secret";
const JWT_EXPIRY = "24h";

export class AuthService {
  constructor(private storage: IStorage) {}

  // Generate JWT token
  generateToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      clientId: user.client_id,
      client_id: user.client_id,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  // Verify token
  verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Login user
  async login(username: string, password: string): Promise<{ token: string; user: User } | null> {
    const user = await this.storage.getUserByUsername(username);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const token = this.generateToken(user);
    return { token, user };
  }

  // Logout user
  async logout(token: string): Promise<void> {
    try {
      const decoded = this.verifyToken(token);
      const expiry = new Date(decoded.exp * 1000); // Convert seconds to milliseconds
      await this.storage.addTokenToBlacklist({ token, expiry });
    } catch (error) {
      // If token is already expired, no need to blacklist
      console.error("Error during logout:", error);
    }
  }

  // Middleware to authenticate requests
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      const token = authHeader.split(" ")[1];
      
      // Check if token is blacklisted
      const isBlacklisted = await this.storage.isTokenBlacklisted(token);
      if (isBlacklisted) {
        res.status(401).json({ message: "Token is no longer valid" });
        return;
      }

      const decoded = this.verifyToken(token);
      
      // Attach user to request
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };

  // Middleware to check user role
  authorize = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: "You don't have permission to access this resource" });
        return;
      }

      next();
    };
  };

  // Middleware to check if user has access to client data
  authorizeClientAccess = (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const requestedClientId = req.params.clientId || req.query.clientId as string;

    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Bfast roles have access to all clients
    if (user.role === UserRole.BFAST_ADMIN || user.role === UserRole.BFAST_EXECUTIVE) {
      next();
      return;
    }

    // Client roles only have access to their own client
    if (user.clientId !== requestedClientId && user.client_id !== requestedClientId) {
      res.status(403).json({ message: "You don't have permission to access data for this client" });
      return;
    }

    next();
  };
}
