import type { Request, Response, NextFunction } from "express";
import db from "@/db";
import { workerStatistics, applications, jobs } from "@/db/schemas/index";
import { and, count, eq } from "drizzle-orm"

// --- Get Stats for Logged-in Worker ---
export const getMyStats = async (req: Request, res: Response) => {
    const workerId = req.user.userId; // Role ensured by middleware

    // Attempt to read from denormalized table first
    let stats = await db.query.workerStatistics.findFirst({
        where: eq(workerStatistics.workerId, workerId),
    });

    // If not found or needs recalculation (e.g., based on last_calculated), calculate on the fly
    if (!stats /* || needsRecalculation */) {
        console.log(`Calculating stats on-the-fly for worker ${workerId}`);
        const submittedCountPromise = db.select({ value: count() }).from(applications).where(eq(applications.workerId, workerId));
        const acceptedCountPromise = db.select({ value: count() }).from(applications).where(and(eq(applications.workerId, workerId), eq(applications.status, 'Accepted')));
        // Jobs completed: Find jobs linked to *accepted* applications by this worker, where job status is 'Completed'
        const completedCountPromise = db.select({ value: count(jobs.jobId) })
            .from(jobs)
            .innerJoin(applications, eq(jobs.jobId, applications.jobId))
            .where(and(
                eq(applications.workerId, workerId),
                eq(applications.status, 'Accepted'), // Only count jobs they were accepted for
                eq(jobs.status, 'Completed')
            ));

        const [submittedCount, acceptedCount, completedCount] = await Promise.all([
            submittedCountPromise, acceptedCountPromise, completedCountPromise
        ]);

        const calculatedStatsData = {
            workerId: workerId,
            applicationsSubmitted: submittedCount[0]?.value ?? 0,
            applicationsAccepted: acceptedCount[0]?.value ?? 0,
            jobsCompleted: completedCount[0]?.value ?? 0,
            lastCalculated: new Date(),
        };

        // Optionally: Upsert (Insert or Update) the calculated stats back into the worker_statistics table
        try {
            await db.insert(workerStatistics)
                .values(calculatedStatsData)
                .onConflictDoUpdate({
                    target: workerStatistics.workerId,
                    set: {
                        applicationsSubmitted: calculatedStatsData.applicationsSubmitted,
                        applicationsAccepted: calculatedStatsData.applicationsAccepted,
                        jobsCompleted: calculatedStatsData.jobsCompleted,
                        lastCalculated: calculatedStatsData.lastCalculated,
                    }
                })
                .returning(); // To confirm upsert
            stats = calculatedStatsData; // Use the newly calculated/upserted data
        } catch (upsertError) {
            console.error(`Failed to upsert statistics for worker ${workerId}:`, upsertError);
            // Fallback to returning calculated stats without saving if upsert fails
            stats = calculatedStatsData;
        }
    }

    res.status(200).json(stats);
};