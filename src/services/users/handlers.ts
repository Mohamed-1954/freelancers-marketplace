import type { Request, Response } from "express";
import type { UpdateProfileRequest } from "./request-types";
import db from "@/db";
import { users } from "@/db/schemas";
import { and, eq, ilike, sql } from "drizzle-orm";
import { findWorkersQuerySchema } from "./validations";

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    // req.user is populated by ensureToken middleware
    const userId = req.user.userId;
    const userProfile = await db.query.users.findFirst({
      where: eq(users.userId, userId),
      columns: {
        password: false,
        refreshToken: false,
      },
    });

    if (!userProfile) {
      res.status(404).json({ message: "User profile not found." });
      return;
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateMyProfile = async (req: UpdateProfileRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const validatedData = req.body; 

    // Prevent clients from updating worker-specific fields & vice-versa
  if (req.user.userType === 'Client') {
    if (validatedData.bio !== undefined || validatedData.skillsSummary !== undefined) {
      res.status(403).json({ message: "Clients cannot update worker-specific fields (bio, skills)." });
      return;
    }
  }
    // Add other updatable fields (profile picture, etc.) as needed

    if (Object.keys(validatedData).length === 0) {
      res.status(400).json({ message: "No update data provided." });
      return;
    }

    // Add updatedAt manually if not using $onUpdate or trigger
    // updatePayload.updatedAt = new Date();

    const updatedUser = await db
      .update(users)
      .set({...validatedData})
      .where(eq(users.userId, userId))
      .returning({ // Return updated fields, excluding sensitive ones
        userId: users.userId,
        username: users.username,
        email: users.email,
        profilePictureUrl: users.profilePictureUrl,
        phoneNumber: users.phoneNumber,
        country: users.country,
        city: users.city,
        bio: users.bio,
        skillsSummary: users.skillsSummary,
        updatedAt: users.updatedAt,
        //... other fields you want to return
      });

    if (!updatedUser || updatedUser.length === 0) {
      res.status(404).json({ message: "User not found or update failed." });
      return;
    }

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser[0] });

  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const findNearbyWorkers = async (req: Request, res: Response) => {
  const {data: validatedData, error: validationError } = findWorkersQuerySchema.safeParse(req.query);

  if (validationError) {
    res.status(400).json({ message: "Invalid query parameters", errors: validationError.errors });
    return;
  }
  const { city, country, limit, offset } = validatedData; // Default values

  // Base query for active workers
  const conditions = [eq(users.userType, 'Worker'), eq(users.isActive, true)];

  if (city) {
    conditions.push(ilike(users.city, `%${city}%`)); // Case-insensitive search
  }
  if (country) {
    conditions.push(ilike(users.country, `%${country}%`));
  }

  // TODO: Implement proper geospatial search if lat/lon are added using PostGIS

  const workerList = await db.query.users.findMany({
    where: and(...conditions),
    columns: { // Select only public profile fields
      userId: true,
      username: true,
      profilePictureUrl: true,
      userType: true, // Should always be 'Worker' here
      city: true,
      country: true,
      bio: true,
      skillsSummary: true,
    },
    limit: limit,
    offset: offset,
    // orderBy: // Add ordering, e.g., by registration date or a future rating
  });

  // Get total count for pagination (can be optimized)
  const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(...conditions));
  const totalCount = totalCountResult[0]?.count ?? 0;

  res.status(200).json({
    workers: workerList,
    pagination: {
      limit,
      offset,
      total: totalCount,
    }
  });
};

export const findSuggestedWorkers = async (req: Request, res: Response) => {
  // TODO: Implement suggestion logic. This is complex and depends on business rules.
  // Examples:
  // 1. Match skills_summary against keywords from a context (e.g., job description query param).
  // 2. Based on location similarity to the client (req.user).
  // 3. Based on workers the client previously hired (requires contracts/history).
  // 4. Based on high ratings (requires reviews).
  // 5. Random selection or newest workers for basic implementation.

  // Placeholder: Return a few active workers
  const suggestedWorkers = await db.query.users.findMany({
    where: and(eq(users.userType, 'Worker'), eq(users.isActive, true)),
    columns: { userId: true, username: true, profilePictureUrl: true, city: true, country: true, skillsSummary: true },
    limit: 5, // Suggest a small number
    orderBy: sql`RANDOM()`, // Example: Random suggestion (inefficient on large tables)
  });

  res.status(200).json(suggestedWorkers);
};