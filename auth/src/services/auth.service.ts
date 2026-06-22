import { prisma } from "../config/db";
import { storeOtp, getOtp, clearOtp } from "../config/redis";
import { Password } from "../utils/password";
import { BadRequestError, NotFoundError, UserPayload } from "../common";
import axios from "axios";
import jwt from "jsonwebtoken";
import { natsWrapper } from "../natswrapper";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const signToken = (payload: UserPayload) =>
  jwt.sign(payload, process.env.JWT_KEY!);

const sanitize = (user: any) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

// ───────────── Worker registration + OTP ─────────────
export const registerWorker = async (email: string, password: string, phone: string) => {
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new BadRequestError("Email already registered");

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) throw new BadRequestError("Phone already registered");

  const passwordHash = await Password.toHash(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, phone, role: "worker", phoneVerified: false },
  });

  const otp = generateOtp();
  await storeOtp(phone, otp);

  // TODO: once Notification Service exists, publish "auth.otp.requested"
  // NATS event here instead of console logging.
  natsWrapper.publish("auth.otp.requested", { phone, otp });
  console.log(`[DEV ONLY] OTP for ${phone}: ${otp}`);

  return {
    userId: user.id,
    // Returned only so you can test without SMS wired up yet.
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
};

export const verifyWorkerOtp = async (phone: string, otp: string) => {
  const storedOtp = await getOtp(phone);
  if (!storedOtp || storedOtp !== otp) {
    throw new BadRequestError("Invalid or expired OTP");
  }

  const user = await prisma.user.update({
    where: { phone },
    data: { phoneVerified: true },
  });

  await clearOtp(phone);

  const token = signToken({ id: user.id, role: "worker" });
  return { token, user: sanitize(user) };
};

export const resendWorkerOtp = async (phone: string) => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new NotFoundError("No registration found for this phone");

  const otp = generateOtp();
  await storeOtp(phone, otp);
  console.log(`[DEV ONLY] Resent OTP for ${phone}: ${otp}`);
  natsWrapper.publish("auth.otp.requested", { phone, otp });
  return {
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
};

// ───────────── Login (all roles) ─────────────

const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL!;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY!;

const fetchRecruiterCategories = async (userId: string): Promise<number[]> => {
  try {
    const res = await axios.get(
      `${ADMIN_SERVICE_URL}/api/admin/internal/recruiter-categories/${userId}`,
      { headers: { "x-internal-key": INTERNAL_API_KEY } },
    );
    return res.data.data.industryIds;
  } catch {
    return []; // fail-safe: no categories rather than crashing login
  }
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new BadRequestError("Invalid credentials");

  const passwordMatch = await Password.compare(user.passwordHash, password);
  if (!passwordMatch) throw new BadRequestError("Invalid credentials");

  if (user.role === "worker" && !user.phoneVerified) {
    throw new BadRequestError("Please verify your phone number first");
  }

  const payload: UserPayload = { id: user.id, role: user.role as UserPayload["role"] };

  if (user.role === "recruiter") {
    payload.assignedCategories = await fetchRecruiterCategories(user.id);
  }

  const token = signToken(payload);
  return { token, user: sanitize(user) };
};



// ───────────── Internal: called by Admin Service to create a recruiter ─────────────
export const internalCreateUser = async (
  email: string,
  password: string,
  role: "recruiter" | "super_admin",
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new BadRequestError("Email already registered");

  const passwordHash = await Password.toHash(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, role, phoneVerified: true },
  });

  return sanitize(user);
};

// ───────────── Current user ─────────────
export const getCurrentUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.isActive) return null;
  return sanitize(user);
};